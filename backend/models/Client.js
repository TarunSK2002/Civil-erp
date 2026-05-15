const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    Name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    MobileNumber: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    PaymentType: {
        type: DataTypes.STRING(50),
        defaultValue: 'Cash'
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'clients',
    timestamps: false
});

module.exports = Client;
