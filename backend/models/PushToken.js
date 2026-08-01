const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PushToken = sequelize.define('PushToken', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    Username: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    ExpoPushToken: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
    },
    DeviceOS: {
        type: DataTypes.STRING(20),
        allowNull: true,
    }
}, {
    tableName: 'push_tokens',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = PushToken;
