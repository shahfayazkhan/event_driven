const eventBus = require('../events/eventBus');
const models = require('../models');

function registerInventorySubscriber() {
  eventBus.on('ORDER_CREATED', async (event) => {
    const { Inventory, Order, Outbox, sequelize } = models;
    const { aggregateId: orderId, payload } = event;
    console.log(`[Subscriber: Inventory] 🏬 Processing ORDER_CREATED for Order: ${orderId}`);

    const transaction = await sequelize.transaction();

    try {
      const order = await Order.findByPk(orderId, { transaction });
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Find product in inventory
      const inventoryItem = await Inventory.findOne({
        where: { productName: payload.productName },
        transaction
      });

      if (!inventoryItem || inventoryItem.availableStock < payload.quantity) {
        const reason = !inventoryItem 
          ? `Product "${payload.productName}" not found in inventory` 
          : `Insufficient stock for "${payload.productName}". Requested: ${payload.quantity}, Available: ${inventoryItem.availableStock}`;

        console.warn(`[Subscriber: Inventory] ⚠️ ${reason}`);

        // Update Order Status to FAILED
        await order.update({
          status: 'FAILED',
          failureReason: reason
        }, { transaction });

        // Emit OUTBOX Event for Order Failed
        await Outbox.create({
          aggregateType: 'Order',
          aggregateId: orderId,
          eventType: 'ORDER_FAILED',
          payload: { orderId, reason, productName: payload.productName }
        }, { transaction });

        await transaction.commit();
        require('../events/outboxWorker').triggerNow();
        return;
      }

      // Deduct available stock & increment reserved stock
      const updatedStock = inventoryItem.availableStock - payload.quantity;
      const updatedReserved = inventoryItem.reservedStock + payload.quantity;

      await inventoryItem.update({
        availableStock: updatedStock,
        reservedStock: updatedReserved
      }, { transaction });

      // Update Order Status to INVENTORY_RESERVED
      await order.update({ status: 'INVENTORY_RESERVED' }, { transaction });

      // Insert OUTBOX Event for INVENTORY_RESERVED
      await Outbox.create({
        aggregateType: 'Inventory',
        aggregateId: inventoryItem.id,
        eventType: 'INVENTORY_RESERVED',
        payload: {
          orderId,
          productName: payload.productName,
          quantity: payload.quantity,
          totalAmount: payload.totalAmount,
          customerEmail: payload.customerEmail
        }
      }, { transaction });

      await transaction.commit();
      console.log(`[Subscriber: Inventory] ✅ Stock reserved for Order ${orderId}. Remaining stock: ${updatedStock}`);

      // Wake up outbox worker immediately
      require('../events/outboxWorker').triggerNow();
    } catch (error) {
      await transaction.rollback();
      console.error(`[Subscriber: Inventory] ❌ Error processing inventory for Order ${orderId}:`, error.message);
    }
  });
}

module.exports = registerInventorySubscriber;
