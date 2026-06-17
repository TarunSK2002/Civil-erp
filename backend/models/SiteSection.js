const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SiteSection = sequelize.define('SiteSection', {
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
    Name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    SortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'site_sections',
    timestamps: false
});

module.exports = SiteSection;
