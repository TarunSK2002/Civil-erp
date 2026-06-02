const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PersonalExpense = sequelize.define('PersonalExpense', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    Description: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    Amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    ExpenseDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    Category: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    Notes: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'personal_expenses',
    timestamps: false
});

module.exports = PersonalExpense;
