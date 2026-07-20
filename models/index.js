const OrderModel = require('./Order');
const OutboxModel = require('./Outbox');
const InventoryModel = require('./Inventory');
const PaymentModel = require('./Payment');
const AuditLogModel = require('./AuditLog');

let models = {};

function initModels(sequelizeInstance) {
  const Order = OrderModel(sequelizeInstance);
  const Outbox = OutboxModel(sequelizeInstance);
  const Inventory = InventoryModel(sequelizeInstance);
  const Payment = PaymentModel(sequelizeInstance);
  const AuditLog = AuditLogModel(sequelizeInstance);

  // Model Associations
  Order.hasMany(Payment, { foreignKey: 'orderId', as: 'payments' });
  Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  models = {
    sequelize: sequelizeInstance,
    Order,
    Outbox,
    Inventory,
    Payment,
    AuditLog
  };

  return models;
}

// Proxies to expose models dynamically after initialization
module.exports = {
  initModels,
  get sequelize() { return models.sequelize; },
  get Order() { return models.Order; },
  get Outbox() { return models.Outbox; },
  get Inventory() { return models.Inventory; },
  get Payment() { return models.Payment; },
  get AuditLog() { return models.AuditLog; }
};
