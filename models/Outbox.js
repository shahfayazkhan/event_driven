const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Outbox = sequelize.define('Outbox', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    aggregateType: {
      type: DataTypes.STRING,
      allowNull: false, // e.g. 'Order', 'Payment', 'Inventory'
    },
    aggregateId: {
      type: DataTypes.STRING,
      allowNull: false // ID of the entity emitting the event
    },
    eventType: {
      type: DataTypes.STRING,
      allowNull: false // e.g. 'ORDER_CREATED', 'PAYMENT_PROCESSED', 'INVENTORY_RESERVED'
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'),
      defaultValue: 'PENDING'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'outbox_events',
    timestamps: true,
    indexes: [
      {
        fields: ['status', 'createdAt']
      },
      {
        fields: ['aggregateType', 'aggregateId']
      }
    ]
  });

  return Outbox;
};
