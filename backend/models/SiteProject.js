const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SiteProject = sequelize.define('SiteProject', {
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
    ProjectName: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    WorkType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: 'New Construction'
    },
    StartDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    EndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    Status: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'In Progress'
    },
    QuotedValue: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
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
    tableName: 'site_projects',
    timestamps: false
});

module.exports = SiteProject;
