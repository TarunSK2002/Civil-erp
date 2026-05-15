const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ShiftMaster = sequelize.define('ShiftMaster', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    ShiftType: {
        type: DataTypes.STRING(30),
        allowNull: false
        // "Half Shift", "1 Shift", "1.5 Shift", "2 Shift", "2.5 Shift", "3 Shift"
    },
    ShiftMultiplier: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: false
        // 0.5, 1, 1.5, 2, 2.5, 3
    },
    Rate: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'shift_masters',
    timestamps: false
});

module.exports = ShiftMaster;
