const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MaterialType = sequelize.define('MaterialType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    Name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },
    IsActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    SortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    Price: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    DefaultUnit: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: 'nos'
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'material_types',
    timestamps: false
});

module.exports = MaterialType;
