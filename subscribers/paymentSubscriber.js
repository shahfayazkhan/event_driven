const eventBus = require('../events/eventBus');
const models = require('../models');

function registerPaymentSubscriber() {
  eventBus.on('INVENTORY_RESERVED', async (event) => {
    const { Payment, Order, Outbox, sequelize } = models;
    const { payload } = event;
    const { orderId, totalAmount } = payload;
    console.log(`[Subscriber: Payment] 💳 Processing payment for Order: ${orderId} (Amount: $${totalAmount})`);

    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction });
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Simulate payment processing
      const txnRef = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Save Payment record
      const payment = await Payment.create({
        orderId,
        amount: totalAmount,
        transactionRef: txnRef,
        paymentMethod: 'CREDIT_CARD',
        status: 'SUCCESS'
      }, { transaction });

      // Update Order Status to PAID & COMPLETED
      await order.update({ status: 'COMPLETED' }, { transaction });

      // Write Outbox events: PAYMENT_PROCESSED & ORDER_COMPLETED
      await Outbox.create({
        aggregateType: 'Payment',
        aggregateId: payment.id,
        eventType: 'PAYMENT_PROCESSED',
        payload: {
          orderId,
          paymentId: payment.id,
          amount: totalAmount,
          transactionRef: txnRef
        }
      }, { transaction });

      await Outbox.create({
        aggregateType: 'Order',
        aggregateId: orderId,
        eventType: 'ORDER_COMPLETED',
        payload: {
          orderId,
          customerEmail: payload.customerEmail,
          productName: payload.productName,
          totalAmount: totalAmount,
          transactionRef: txnRef
        }
      }, { transaction });

      await transaction.commit();
      console.log(`[Subscriber: Payment] ✅ Payment ${txnRef} successful! Order ${orderId} COMPLETED.`);

      require('../events/outboxWorker').triggerNow();
    } catch (error) {
      await transaction.rollback();
      console.error(`[Subscriber: Payment] ❌ Payment failed for Order ${orderId}:`, error.message);
    }
  });
}

module.exports = registerPaymentSubscriber;
