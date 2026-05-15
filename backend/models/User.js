const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    PasswordHash: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    Role: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'EMP' // 'ADMIN' or 'EMP'
    },
    FullName: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'users',
    timestamps: false
});

module.exports = User;
