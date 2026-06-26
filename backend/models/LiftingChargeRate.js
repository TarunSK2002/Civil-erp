const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LiftingChargeRate = sequelize.define('LiftingChargeRate', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    MaterialType: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    Floor: {
        type: DataTypes.STRING(50),
        allowNull: false
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
    tableName: 'lifting_charge_rates',
    timestamps: false
});

module.exports = LiftingChargeRate;
