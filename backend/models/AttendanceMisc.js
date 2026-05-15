const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AttendanceMisc = sequelize.define('AttendanceMisc', {
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
    MiscName: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    Amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'attendance_miscs',
    timestamps: false
});

module.exports = AttendanceMisc;
