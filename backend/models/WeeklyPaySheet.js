const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WeeklyPaySheet = sequelize.define('WeeklyPaySheet', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    Title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    WeekDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    Status: {
        type: DataTypes.STRING(20),
        defaultValue: 'Open'
        // Open, Closed
    },
    SelectedPayeeIds: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const val = this.getDataValue('SelectedPayeeIds');
            try { return JSON.parse(val || '[]'); } catch { return []; }
        },
        set(val) {
            this.setDataValue('SelectedPayeeIds', JSON.stringify(val || []));
        }
    },
    SelectedSiteIds: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
            const val = this.getDataValue('SelectedSiteIds');
            try { return JSON.parse(val || '[]'); } catch { return []; }
        },
        set(val) {
            this.setDataValue('SelectedSiteIds', JSON.stringify(val || []));
        }
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'weekly_pay_sheets',
    timestamps: false
});

module.exports = WeeklyPaySheet;
