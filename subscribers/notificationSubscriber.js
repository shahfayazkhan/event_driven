const eventBus = require('../events/eventBus');

function registerNotificationSubscriber() {
  eventBus.on('ORDER_COMPLETED', (event) => {
    const { payload } = event;
    console.log(`[Subscriber: Notification] 📧 SENDING EMAIL to "${payload.customerEmail}": Order #${payload.orderId} successfully completed! Total: $${payload.totalAmount}`);
  });

  eventBus.on('ORDER_FAILED', (event) => {
    const { payload } = event;
    console.log(`[Subscriber: Notification] ⚠️ SENDING ALERT EMAIL for Order #${payload.orderId}: Reason - ${payload.reason}`);
  });
}

module.exports = registerNotificationSubscriber;
