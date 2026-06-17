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
    Discount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    DealerName: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: ''
    },
    Length: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    Breadth: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    SqFt: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true
    },
    WastagePercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
    },
    RatePerUnit: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true,
        defaultValue: 0
    },
    CalculationMode: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Manual'
    },
    SectionId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ProjectId: {
        type: DataTypes.INTEGER,
        allowNull: true
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
