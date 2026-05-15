const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Labour = sequelize.define('Labour', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    Name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    MobileNo: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    AccountNo: {
        type: DataTypes.STRING(30),
        defaultValue: ''
    },
    LabourType: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    PayeeId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    CreatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'labours',
    timestamps: false
});

module.exports = Labour;
