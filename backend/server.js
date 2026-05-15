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

// Database Initialization & Server Start
async function startServer() {
    // 1. Ensure DB exists
    await ensureDatabaseExists();

    try {
        // 2. Connect and Sync
        await sequelize.authenticate();
        console.log('Database connected...');
        
        // Use alter: true to automatically update tables when models change
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
// Trigger nodemon restart
