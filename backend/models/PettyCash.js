const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PettyCash = sequelize.define('PettyCash', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    WeeklyPaySheetId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    WeekDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    TotalIncome: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    TotalExpense: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    ExtraPayments: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    ProfitAmount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    RunningBalance: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'petty_cash_transactions',
    timestamps: false
});

module.exports = PettyCash;
