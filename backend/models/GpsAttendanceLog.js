const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GpsAttendanceLog = sequelize.define('GpsAttendanceLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    UserId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    Username: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    Latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
    },
    Longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
    },
    Address: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    CheckInTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    }
}, {
    tableName: 'gps_attendance_logs',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = GpsAttendanceLog;
