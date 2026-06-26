const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LiftingRecord = sequelize.define('LiftingRecord', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    AttendanceSheetId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    PayeeId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    SiteId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    MaterialType: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    Floor: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    Quantity: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 1
    },
    Rate: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    Amount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    LiftingDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'lifting_records',
    timestamps: false
});

module.exports = LiftingRecord;
