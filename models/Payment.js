const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    transactionRef: {
      type: DataTypes.STRING,
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: 'CREDIT_CARD'
    },
    status: {
      type: DataTypes.ENUM('SUCCESS', 'FAILED', 'REFUNDED'),
      defaultValue: 'SUCCESS'
    }
  }, {
    tableName: 'payments',
    timestamps: true
  });

  return Payment;
};
