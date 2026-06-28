const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Default fallbacks for packaged app where .env might not be included
process.env.DB_NAME = process.env.DB_NAME || 'jeeva_construction';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASS = process.env.DB_PASS || '12345678';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.PORT = process.env.PORT || 5000;

const { sequelize } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => res.json({ status: 'OK' }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/sites', require('./routes/siteRoutes'));
app.use('/api/labours', require('./routes/labourRoutes'));
app.use('/api/materials', require('./routes/materialRoutes'));
app.use('/api/site-materials', require('./routes/siteMaterialRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/payees', require('./routes/payeeRoutes'));
app.use('/api/weekly-pay-sheets', require('./routes/weeklyPaySheetRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/shift-master', require('./routes/shiftMasterRoutes'));
app.use('/api/attendance-sheets', require('./routes/attendanceRoutes'));
app.use('/api/person-types', require('./routes/personTypeRoutes'));
app.use('/api/material-types', require('./routes/materialTypeRoutes'));
app.use('/api/petty-cash', require('./routes/pettyCashRoutes'));
app.use('/api/personal-expenses', require('./routes/personalExpenseRoutes'));
app.use('/api/master-settings', require('./routes/masterSettingsRoutes'));
app.use('/api/undo', require('./routes/undoRoutes'));
app.use('/api/site-sections', require('./routes/siteSectionRoutes'));
app.use('/api/site-projects', require('./routes/siteProjectRoutes'));

// Sync Routes
const syncManager = require('./sync/syncManager');
app.get('/api/sync-status', async (req, res) => {
    try {
        const isOnline = syncManager.isOnlineStatus();
        const pendingCount = await syncManager.getPendingCount();
        res.json({ isOnline, pendingCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sync-trigger', async (req, res) => {
    try {
        await syncManager.syncNow();
        const isOnline = syncManager.isOnlineStatus();
        const pendingCount = await syncManager.getPendingCount();
        res.json({ success: true, isOnline, pendingCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sync-pull', async (req, res) => {
    try {
        await syncManager.pullNow();
        const isOnline = syncManager.isOnlineStatus();
        const pendingCount = await syncManager.getPendingCount();
        res.json({ success: true, isOnline, pendingCount });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Generic database sync endpoint
app.post('/api/sync', async (req, res) => {
    const { tableName, action, uuid, payload } = req.body;
    
    try {
        const dbModels = require('./models');
        
        // Find corresponding Sequelize model by tableName matching
        const modelName = Object.keys(dbModels).find(key => {
            const m = dbModels[key];
            return m && m.tableName === tableName;
        });
        
        if (!modelName) {
            return res.status(400).json({ error: `Model for table "${tableName}" not found` });
        }
        
        const Model = dbModels[modelName];
        
        if (action === 'CREATE' || action === 'UPDATE') {
            let existingRecord = await Model.findOne({ where: { uuid } });
            
            // Fallback: If not found by uuid, check if a record with the same primary key exists
            if (!existingRecord) {
                const pkValue = payload ? (payload.Id || payload.id) : null;
                if (pkValue) {
                    existingRecord = await Model.findByPk(pkValue);
                    if (existingRecord) {
                        console.log(`Linking existing record in table "${tableName}" with ID ${pkValue} to UUID ${uuid}`);
                        await existingRecord.update({ uuid });
                    }
                }
            }

            if (existingRecord) {
                // Update
                const updatePayload = payload ? { ...payload } : {};
                delete updatePayload.id;
                delete updatePayload.Id;
                await existingRecord.update(updatePayload);
            } else {
                // Create
                await Model.create({ ...(payload || {}), uuid });
            }
        } else if (action === 'DELETE') {
            let existingRecord = await Model.findOne({ where: { uuid } });
            if (!existingRecord) {
                const pkValue = payload ? (payload.Id || payload.id) : null;
                if (pkValue) {
                    existingRecord = await Model.findByPk(pkValue);
                }
            }
            
            if (existingRecord) {
                if (Model.rawAttributes.is_deleted) {
                    await existingRecord.update({ is_deleted: true });
                } else {
                    await existingRecord.destroy();
                }
            }
        }
        
        res.json({ success: true });
    } catch (err) {
        console.error(`Sync error on table "${tableName}":`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// GET endpoint to fetch all data from cloud DB for synchronization
app.get('/api/sync/pull', async (req, res) => {
    try {
        const dbModels = require('./models');
        const data = {};
        
        const syncableModelKeys = Object.keys(dbModels).filter(key => {
            return key !== 'sequelize' && key !== 'SyncQueue' && key !== 'User' && key !== 'ActionLog' && key !== 'LiftingChargeRate';
        });

        for (const key of syncableModelKeys) {
            const Model = dbModels[key];
            // Fetch all records from MySQL
            const records = await Model.findAll();
            data[Model.tableName] = records;
        }

        res.json(data);
    } catch (err) {
        console.error('Failed to pull sync data:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Database Initialization & Server Start
async function startServer() {
    try {
        // 1. Connect and Sync
        await sequelize.authenticate();
        console.log('Database connected...');

        // Use standard sync to avoid foreign key drop errors
        await sequelize.sync();
        console.log('Database synchronized.');

        // Ensure master_settings table exists and is seeded with defaults
        const isSqlite = sequelize.options.dialect === 'sqlite';
        if (isSqlite) {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS master_settings (
                    Id INTEGER PRIMARY KEY AUTOINCREMENT,
                    SettingKey VARCHAR(100) NOT NULL UNIQUE,
                    SettingValue VARCHAR(255) NOT NULL DEFAULT '',
                    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            await sequelize.query(`INSERT OR IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('TeaExpense', '20');`);
            await sequelize.query(`INSERT OR IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('BusExpense', '50');`);
            await sequelize.query(`INSERT OR IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('LatestAppVersion', '2.7.0');`);
            await sequelize.query(`INSERT OR IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('UpdateLink', 'https://drive.google.com');`);
            console.log('SQLite master_settings table verified/created.');
        } else {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS master_settings (
                    Id INT AUTO_INCREMENT PRIMARY KEY,
                    SettingKey VARCHAR(100) NOT NULL UNIQUE,
                    SettingValue VARCHAR(255) NOT NULL DEFAULT '',
                    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                );
            `);
            await sequelize.query(`INSERT IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('TeaExpense', '20'), ('BusExpense', '50'), ('LatestAppVersion', '2.7.0'), ('UpdateLink', 'https://drive.google.com');`);
            console.log('MySQL master_settings table verified/created.');
        }


        // 2. Initialize Sync Queue & Start background sync loop
        const SyncQueue = require('./sync/syncQueue');
        await SyncQueue.sync();
        
        // Set up IPC status callback to notify Electron main process
        syncManager.setStatusCallback((data) => {
            if (process.send) {
                process.send({ type: 'sync-status-changed', data });
            }
        });

        // Start check loop every 15 seconds
        syncManager.startSyncLoop(15000);
        console.log('Background sync manager loop started.');


        // 3. Ensure Default Admin User exists
        const { User } = require('./models');
        const adminCount = await User.count();
        if (adminCount === 0) {
            const bcrypt = require('bcryptjs');
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin123', salt);

            await User.create({
                Username: 'admin',
                PasswordHash: hashedPassword,
                Role: 'ADMIN',
                FullName: 'Administrator',
                CreatedAt: new Date()
            });
            console.log('Default admin user created (admin/admin123)');
        }

        // 4. Start listening
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

startServer();
// Trigger nodemon restart 2
