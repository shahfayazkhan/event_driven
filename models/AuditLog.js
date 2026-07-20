const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define('AuditLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    eventId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    sourceSubscriber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    actionSummary: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
    }
  }, {
    tableName: 'audit_logs',
    timestamps: true
  });

  return AuditLog;
};
