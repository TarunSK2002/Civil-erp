const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Material = sequelize.define('Material', {
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
    DealerName: {
        type: DataTypes.STRING(100),
        defaultValue: ''
    },
    MobileNo: {
        type: DataTypes.STRING(15),
        defaultValue: ''
    },
    AccountNo: {
        type: DataTypes.STRING(30),
        defaultValue: ''
    },
    MaterialTypeId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'materials',
    timestamps: false
});

module.exports = Material;
