const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Default fallbacks for cloud / packaged app where .env might not be included
process.env.DB_NAME = process.env.DB_NAME || 'tideorca1_Jeeva_Construction';
process.env.DB_USER = process.env.DB_USER || 'tideorca1_admin';
process.env.DB_PASS = process.env.DB_PASS || 'Password0@';
process.env.DB_HOST = process.env.DB_HOST || '103.86.176.249';
process.env.DB_PORT = process.env.DB_PORT || '3306';
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
    if (!origin || whitelist.indexOf(origin) !== -1 || origin.startsWith('http://localhost:') || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'QUERY'],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Global Rate Limiter
app.use(generalLimiter);

// Lightweight test routes
app.get('/ping', (req, res) => res.json({ status: 'OK', service: 'jeeva-backend', time: new Date().toISOString() }));
app.get('/api/ping', (req, res) => res.json({ status: 'OK', service: 'jeeva-backend', time: new Date().toISOString() }));

// Health check routes
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'OK', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: 'disconnected', error: err.message });
    }
});
app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({ status: 'OK', database: 'connected' });
    } catch (err) {
        res.status(500).json({ status: 'ERROR', database: 'disconnected', error: err.message });
    }
});

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

// Global error handler
app.use((err, req, res, next) => {
    console.error('API Error:', err);
    res.status(err.status || 500).json({
        status: 'ERROR',
        message: err.message || 'Internal Server Error'
    });
});

// Database Initialization & Server Start
async function startServer() {
    try {
        // 1. Start listening immediately so server handles health checks and incoming HTTP requests instantly
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // 2. Authenticate Database Connection
        await sequelize.authenticate();
        console.log('Database connected successfully.');
    } catch (err) {
        console.error('Failed to start server or connect to database:', err);
    }
}

if (!process.env.VERCEL) {
    startServer();
}

module.exports = app;
