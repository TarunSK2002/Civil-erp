const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SiteWorkValue = sequelize.define('SiteWorkValue', {
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
    WorkName: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    Value: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'site_work_values',
    timestamps: false
});

module.exports = SiteWorkValue;
