const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Default fallbacks for packaged app where .env might not be included
process.env.DB_NAME = process.env.DB_NAME || 'jeeva_construction';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASS = process.env.DB_PASS || '12345678';
process.env.DB_HOST = process.env.DB_HOST || '127.0.0.1';
process.env.PORT = process.env.PORT || 5000;

const { sequelize } = require('./models');
const { generalLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middlewares
app.use(helmet());

// CORS config
const whitelist = [
  'http://localhost:3000', 
  'http://localhost:5173', 
  'http://localhost:8080'
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'QUERY'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Global Rate Limiter
app.use(generalLimiter);

// Routes
app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

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
app.use('/api/dpr', require('./routes/dprRoutes'));
app.use('/api/gps', require('./routes/gpsRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Database Initialization & Server Start
async function startServer() {
    try {
        // 1. Connect and Sync
        await sequelize.authenticate();
        console.log('Database connected...');

        // Use standard sync to avoid foreign key drop errors
        await sequelize.sync();
        console.log('Database synchronized.');

        // Run migrations for newly added columns
        try {
            await sequelize.query("ALTER TABLE person_types ADD COLUMN RateUnit VARCHAR(10) NOT NULL DEFAULT 'Day';");
            console.log('Added RateUnit column to person_types database table.');
        } catch (err) {
            // Column already exists or table doesn't exist yet, which is fine
        }

        try {
            await sequelize.query("ALTER TABLE attendance_records ADD COLUMN Hours DECIMAL(10, 2) NULL;");
            console.log('Added Hours column to attendance_records.');
        } catch (err) {}

        try {
            await sequelize.query("ALTER TABLE attendance_records ADD COLUMN RatePerHour DECIMAL(18, 2) NULL;");
            console.log('Added RatePerHour column to attendance_records.');
        } catch (err) {}

        try {
            await sequelize.query("ALTER TABLE site_materials ADD COLUMN BillNo VARCHAR(50) NULL DEFAULT '';");
            console.log('Added BillNo column to site_materials table.');
        } catch (err) {}

        // Ensure master_settings table exists and is seeded with defaults
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS master_settings (
                Id INT AUTO_INCREMENT PRIMARY KEY,
                SettingKey VARCHAR(100) NOT NULL UNIQUE,
                SettingValue VARCHAR(255) NOT NULL DEFAULT '',
                UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);
        await sequelize.query(`INSERT IGNORE INTO master_settings (SettingKey, SettingValue) VALUES ('TeaExpense', '20'), ('BusExpense', '50'), ('LatestAppVersion', '3.2.0'), ('UpdateLink', 'https://drive.google.com');`);
        await sequelize.query(`UPDATE master_settings SET SettingValue = '3.2.0' WHERE SettingKey = 'LatestAppVersion';`);
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
