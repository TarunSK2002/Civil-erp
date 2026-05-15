const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WeeklyPaySheetItem = sequelize.define('WeeklyPaySheetItem', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    WeeklyPaySheetId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    PayeeId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    Amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    PaymentStatus: {
        type: DataTypes.STRING(20),
        defaultValue: 'Pending'
        // Pending, Paid
    },
    PaymentId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    PaymentDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    PaymentMode: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    PaymentNotes: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'weekly_pay_sheet_items',
    timestamps: false
});

module.exports = WeeklyPaySheetItem;
