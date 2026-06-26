const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AttendanceRecord = sequelize.define('AttendanceRecord', {
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
    PersonType: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Mason'
    },
    AttendanceDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    CalculationMode: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'Shift' // 'Shift' or 'SqFt'
    },
    ShiftType: {
        type: DataTypes.STRING(30),
        allowNull: true
    },
    ShiftMultiplier: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true
    },
    LabourCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    RatePerShift: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true
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
    RatePerSqFt: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: true
    },
    SectionId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    ProjectId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    CalculatedAmount: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'attendance_records',
    timestamps: false
});

module.exports = AttendanceRecord;
