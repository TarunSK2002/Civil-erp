const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payee = sequelize.define('Payee', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    Type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Labour'
        // Labour, Contractor, Supplier, Material, Advance, Site Cash, Other
    },
    MobileNo: {
        type: DataTypes.STRING(15),
        defaultValue: ''
    },
    AccountNo: {
        type: DataTypes.STRING(30),
        defaultValue: ''
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
    tableName: 'payees',
    timestamps: false
});

module.exports = Payee;
