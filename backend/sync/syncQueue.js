const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SyncQueue = sequelize.define('SyncQueue', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'Id'
  },
  tableName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'table_name'
  },
  recordUuid: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'record_uuid'
  },
  action: {
    type: DataTypes.STRING, // CREATE, UPDATE, DELETE
    allowNull: false
  },
  payload: {
    type: DataTypes.TEXT, // Store JSON string of the client model data
    allowNull: true
  },
  status: {
    type: DataTypes.STRING, // PENDING, SYNCED, FAILED
    defaultValue: 'PENDING',
    allowNull: false
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  }
}, {
  tableName: 'sync_queue',
  timestamps: true,
  underscored: true
});

module.exports = SyncQueue;
