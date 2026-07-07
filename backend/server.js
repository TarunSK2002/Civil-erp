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

        // 2. Ensure Default Admin User exists
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

        // 3. Start listening
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
    }
}

startServer();
