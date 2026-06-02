const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PersonType = sequelize.define('PersonType', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        field: 'Id'
    },
    Name: {
        type: DataTypes.STRING(50),
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
    DailyRate: {
        type: DataTypes.DECIMAL(18, 2),
        allowNull: false,
        defaultValue: 0
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'person_types',
    timestamps: false
});

module.exports = PersonType;
