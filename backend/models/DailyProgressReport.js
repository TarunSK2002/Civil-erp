const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DailyProgressReport = sequelize.define('DailyProgressReport', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    ReportDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    WorkDone: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    LabourCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    Issues: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    WeatherCondition: {
        type: DataTypes.STRING(50),
        defaultValue: 'Sunny',
    },
    CreatedBy: {
        type: DataTypes.STRING(100),
        allowNull: true,
    }
}, {
    tableName: 'daily_progress_reports',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = DailyProgressReport;
