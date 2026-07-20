const registerInventorySubscriber = require('./inventorySubscriber');
const registerPaymentSubscriber = require('./paymentSubscriber');
const registerNotificationSubscriber = require('./notificationSubscriber');
const registerAuditSubscriber = require('./auditSubscriber');

function initSubscribers() {
  registerInventorySubscriber();
  registerPaymentSubscriber();
  registerNotificationSubscriber();
  registerAuditSubscriber();
  console.log('[Subscribers] 📡 All domain event subscribers registered successfully.');
}

module.exports = { initSubscribers };
