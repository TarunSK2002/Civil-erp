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

// Database Initialization & Server Start
async function startServer() {
    // 1. Ensure DB exists
    await ensureDatabaseExists();

    try {
        // 2. Connect and Sync
        await sequelize.authenticate();
        console.log('Database connected...');

        // Safe schema migrations — each silently skips if column already exists
        const migrations = [
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
            `INSERT IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('TeaExpense', '20'), ('BusExpense', '50');`
        ];
        for (const sql of migrations) {
            try { await sequelize.query(sql); } catch (e) { /* column already exists */ }
        }

        // Use standard sync to avoid foreign key drop errors
        await sequelize.sync();
        console.log('Database synchronized.');

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
