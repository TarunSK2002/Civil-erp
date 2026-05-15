const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AttendanceRecord = sequelize.define('AttendanceRecord', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    AttendanceSheetId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    PayeeId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    AttendanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    ShiftType: {
        type: DataTypes.STRING(30),
        allowNull: false
        // "Half Shift", "1 Shift", "1.5 Shift", "2 Shift", "2.5 Shift", "3 Shift"
    },
    ShiftMultiplier: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: false
    },
    LabourCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    RatePerShift: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
    },
    CalculatedAmount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
        // LabourCount * RatePerShift
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'attendance_records',
    timestamps: false
});

module.exports = AttendanceRecord;
