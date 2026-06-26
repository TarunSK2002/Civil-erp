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
const ensureDatabaseExists = require('./config/dbInit');

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
            const existingRecord = await Model.findOne({ where: { uuid } });
            if (existingRecord) {
                // Update
                const updatePayload = { ...payload };
                delete updatePayload.id;
                delete updatePayload.Id;
                await existingRecord.update(updatePayload);
            } else {
                // Create
                await Model.create({ ...payload, uuid });
            }
        } else if (action === 'DELETE') {
            const existingRecord = await Model.findOne({ where: { uuid } });
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

// Database Initialization & Server Start
async function startServer() {
    const isSqlite = process.env.DB_DIALECT === 'sqlite';

    // 1. Ensure DB exists (only for MySQL)
    if (!isSqlite) {
        await ensureDatabaseExists();
    }

    try {
        // 2. Connect and Sync
        await sequelize.authenticate();
        console.log('Database connected...');

        // Safe schema migrations — each silently skips if column already exists or table does not exist yet
        const migrations = [
            // Schema migrations (V1 -> V2)
            "ALTER TABLE weekly_pay_sheets ADD COLUMN SelectedPayeeIds TEXT NULL;",
            "ALTER TABLE weekly_pay_sheets ADD COLUMN SelectedSiteIds TEXT NULL;",
            "ALTER TABLE payments ADD COLUMN PayeeId INT NULL;",
            "ALTER TABLE labours ADD COLUMN PayeeId INT NULL;",
            "ALTER TABLE sites ADD COLUMN Progress DECIMAL(5,2) DEFAULT 0;",
            "ALTER TABLE site_materials ADD COLUMN Amount DECIMAL(18,2) DEFAULT 0;",
            "ALTER TABLE site_materials ADD COLUMN DealerName VARCHAR(100) DEFAULT '';",
            "ALTER TABLE sites ADD COLUMN NextMilestone VARCHAR(255) DEFAULT '';",
            "ALTER TABLE materials DROP COLUMN Rate;",

            // Schema migrations (V2 -> V3)
            "ALTER TABLE attendance_records ADD COLUMN PersonType VARCHAR(30) NOT NULL DEFAULT 'Mason';",
            "ALTER TABLE person_types ADD COLUMN DailyRate DECIMAL(18,2) NOT NULL DEFAULT 0;",
            "ALTER TABLE materials ADD COLUMN DealerName VARCHAR(100) DEFAULT '';",
            "ALTER TABLE materials ADD COLUMN MobileNo VARCHAR(15) DEFAULT '';",
            "ALTER TABLE materials ADD COLUMN AccountNo VARCHAR(30) DEFAULT '';",
            "ALTER TABLE materials ADD COLUMN MaterialTypeId INT DEFAULT NULL;",
            "ALTER TABLE weekly_pay_sheet_items ADD COLUMN IsSkipped TINYINT(1) NOT NULL DEFAULT 0;",
            "ALTER TABLE weekly_pay_sheet_items ADD COLUMN SkippedToSheetId INT DEFAULT NULL;",
            "ALTER TABLE weekly_pay_sheet_items ADD COLUMN IsExtraPayment TINYINT(1) NOT NULL DEFAULT 0;",
            "ALTER TABLE weekly_pay_sheet_items ADD COLUMN ExtraPaymentDescription VARCHAR(255) DEFAULT NULL;",
            "ALTER TABLE weekly_pay_sheets ADD COLUMN Status VARCHAR(20) NOT NULL DEFAULT 'Open';",
            "ALTER TABLE material_types ADD COLUMN Price DECIMAL(18,2) NOT NULL DEFAULT 0;",
            "ALTER TABLE material_types ADD COLUMN DefaultUnit VARCHAR(50) DEFAULT 'nos';",
            `CREATE TABLE IF NOT EXISTS master_settings (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                SettingKey VARCHAR(100) NOT NULL UNIQUE,
                SettingValue VARCHAR(255) NOT NULL DEFAULT '',
                UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );`,
            `INSERT IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('TeaExpense', '20'), ('BusExpense', '50');`,

            // Fix site_materials foreign key constraint mismatch (drop developer & client constraint names)
            "ALTER TABLE site_materials DROP FOREIGN KEY site_materials_ibfk_14;",
            "ALTER TABLE site_materials DROP FOREIGN KEY site_materials_ibfk_6;",
            "ALTER TABLE site_materials ADD CONSTRAINT fk_site_materials_material_type FOREIGN KEY (MaterialId) REFERENCES material_types (Id) ON DELETE CASCADE ON UPDATE CASCADE;",

            // Schema migrations (V3 -> V4)
            "ALTER TABLE material_types ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Manual';",
            "ALTER TABLE site_materials ADD COLUMN Length DECIMAL(10,2) DEFAULT NULL;",
            "ALTER TABLE site_materials ADD COLUMN Breadth DECIMAL(10,2) DEFAULT NULL;",
            "ALTER TABLE site_materials ADD COLUMN SqFt DECIMAL(12,2) DEFAULT NULL;",
            "ALTER TABLE site_materials ADD COLUMN WastagePercent DECIMAL(5,2) DEFAULT 0;",
            "ALTER TABLE site_materials ADD COLUMN RatePerUnit DECIMAL(18,2) DEFAULT 0;",
            "ALTER TABLE site_materials ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Manual';",
            "ALTER TABLE weekly_pay_sheet_items ADD COLUMN SourceType VARCHAR(30) DEFAULT 'Attendance';",
            "ALTER TABLE weekly_pay_sheet_items ADD COLUMN SourceMaterialIds TEXT DEFAULT NULL;",
            `CREATE TABLE IF NOT EXISTS action_logs (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                WeeklyPaySheetId INT NOT NULL,
                ActionType VARCHAR(50) NOT NULL,
                EntityType VARCHAR(30) NOT NULL,
                EntityId INT DEFAULT NULL,
                BeforeData JSON DEFAULT NULL,
                AfterData JSON DEFAULT NULL,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                IsUndone TINYINT(1) NOT NULL DEFAULT 0,
                INDEX idx_action_logs_sheet (WeeklyPaySheetId),
                INDEX idx_action_logs_created (CreatedAt)
            );`,
            `CREATE TABLE IF NOT EXISTS site_sections (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                SiteId INT NOT NULL,
                Name VARCHAR(100) NOT NULL,
                SortOrder INT DEFAULT 0,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
            );`,
            `CREATE TABLE IF NOT EXISTS site_projects (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                SiteId INT NOT NULL,
                ProjectName VARCHAR(200) NOT NULL,
                WorkType VARCHAR(100) DEFAULT 'New Construction',
                StartDate DATE DEFAULT NULL,
                EndDate DATE DEFAULT NULL,
                Status VARCHAR(30) DEFAULT 'In Progress',
                QuotedValue DECIMAL(18,2) DEFAULT 0,
                Notes VARCHAR(500) DEFAULT NULL,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
            );`,
            "ALTER TABLE site_materials ADD COLUMN SectionId INT DEFAULT NULL;",
            "ALTER TABLE site_materials ADD COLUMN ProjectId INT DEFAULT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN SectionId INT DEFAULT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN ProjectId INT DEFAULT NULL;",
            "ALTER TABLE weekly_pay_sheet_items ADD COLUMN ProjectId INT DEFAULT NULL;",
            
            // Schema migrations (V4 -> V5)
            "ALTER TABLE site_sections ADD COLUMN Length DECIMAL(10,2) DEFAULT NULL;",
            "ALTER TABLE site_sections ADD COLUMN Breadth DECIMAL(10,2) DEFAULT NULL;",
            "ALTER TABLE site_sections ADD COLUMN Height DECIMAL(10,2) DEFAULT NULL;",
            "ALTER TABLE site_sections ADD COLUMN Area DECIMAL(12,2) DEFAULT NULL;",
            "ALTER TABLE site_sections ADD COLUMN SectionValue DECIMAL(18,2) DEFAULT 0;",
            "ALTER TABLE site_sections ADD COLUMN RatePerSqFt DECIMAL(18,2) DEFAULT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Shift';",
            "ALTER TABLE attendance_records ADD COLUMN Length DECIMAL(10,2) DEFAULT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN Breadth DECIMAL(10,2) DEFAULT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN SqFt DECIMAL(12,2) DEFAULT NULL;",
            "ALTER TABLE attendance_records ADD COLUMN RatePerSqFt DECIMAL(18,2) DEFAULT NULL;",
            `CREATE TABLE IF NOT EXISTS lifting_charge_rates (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                MaterialType VARCHAR(50) NOT NULL,
                Floor VARCHAR(50) NOT NULL,
                Rate DECIMAL(18,2) NOT NULL DEFAULT 0,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY idx_lifting_rates_mat_floor (MaterialType, Floor)
            );`,
            `INSERT IGNORE INTO lifting_charge_rates (MaterialType, Floor, Rate) VALUES
                ('M.Sand', 'G.Floor', 1700.00),
                ('M.Sand', '1st floor', 2200.00),
                ('M.Sand', '2nd floor', 3200.00),
                ('M.Sand', '3rd floor', 4200.00),
                ('Jally', 'G.Floor', 2000.00),
                ('Jally', '1st floor', 2600.00),
                ('Jally', '2nd floor', 3600.00),
                ('Jally', '3rd floor', 4600.00),
                ('Sengal', 'G.Floor', 0.90),
                ('Sengal', '1st floor', 1.30),
                ('Sengal', '2nd floor', 2.20),
                ('Sengal', '3rd floor', 3.60);`,
            `CREATE TABLE IF NOT EXISTS lifting_records (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                AttendanceSheetId INT NOT NULL,
                PayeeId INT NOT NULL,
                SiteId INT NOT NULL,
                MaterialType VARCHAR(50) NOT NULL,
                Floor VARCHAR(50) NOT NULL,
                Quantity DECIMAL(12,2) NOT NULL DEFAULT 1,
                Rate DECIMAL(18,2) NOT NULL DEFAULT 0,
                Amount DECIMAL(18,2) NOT NULL DEFAULT 0,
                LiftingDate DATE NOT NULL,
                CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (AttendanceSheetId) REFERENCES attendance_sheets(Id) ON DELETE CASCADE,
                FOREIGN KEY (PayeeId) REFERENCES payees(Id) ON DELETE CASCADE,
                FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
            );`
        ];
        
        if (!isSqlite) {
            for (const sql of migrations) {
                try { await sequelize.query(sql); } catch (e) { /* column already exists / table does not exist / error ignored */ }
            }
        }

        // Use standard sync to avoid foreign key drop errors
        await sequelize.sync();
        console.log('Database synchronized.');

        // Initialize Sync Queue & Start background sync loop if SQLite is local database
        if (isSqlite) {
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
        }

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
