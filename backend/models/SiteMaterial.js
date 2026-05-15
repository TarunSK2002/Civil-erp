const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SiteMaterial = sequelize.define('SiteMaterial', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    MaterialId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    Quantity: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false
    },
    Unit: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    Amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    DealerName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: ''
    },
    PurchaseDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'site_materials',
    timestamps: false
});

module.exports = SiteMaterial;
