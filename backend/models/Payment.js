const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    PaymentCategory: {
        type: DataTypes.STRING(20),
        allowNull: false // "Material" or "Labour"
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    LabourId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    MaterialId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    PayeeId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    Amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
    },
    PaymentMode: {
        type: DataTypes.STRING(30),
        defaultValue: 'Cash'
    },
    Notes: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    PaymentDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'payments',
    timestamps: false
});

module.exports = Payment;
