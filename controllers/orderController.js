const models = require('../models');
const outboxWorker = require('../events/outboxWorker');

exports.createOrder = async (req, res) => {
  const { customerName, customerEmail, productName, quantity } = req.body;
  const { Order, Outbox, Inventory, sequelize } = models;

  if (!customerName || !customerEmail || !productName || !quantity) {
    return res.status(400).json({ error: 'Missing required fields: customerName, customerEmail, productName, quantity' });
  }

  // Start Transactional Outbox Workflow
  const transaction = await sequelize.transaction();

  try {
    // Check product price
    const item = await Inventory.findOne({ where: { productName }, transaction });
    const unitPrice = item ? parseFloat(item.unitPrice) : 99.99;
    const totalAmount = (unitPrice * parseInt(quantity, 10)).toFixed(2);

    // 1. Create Order record in DB
    const order = await Order.create({
      customerName,
      customerEmail,
      productName,
      quantity: parseInt(quantity, 10),
      unitPrice,
      totalAmount,
      status: 'PENDING'
    }, { transaction });

    // 2. Create Outbox record in DB WITHIN THE SAME TRANSACTION
    const outboxEvent = await Outbox.create({
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'ORDER_CREATED',
      payload: {
        orderId: order.id,
        customerName,
        customerEmail,
        productName,
        quantity: parseInt(quantity, 10),
        totalAmount
      },
      status: 'PENDING'
    }, { transaction });

    // Commit both domain change and outbox event together!
    await transaction.commit();

    console.log(`[Order API] 🎯 Order ${order.id} created & Outbox event ${outboxEvent.id} committed atomically.`);

    // Trigger worker to process immediately
    outboxWorker.triggerNow();

    return res.status(201).json({
      message: 'Order created successfully and queued for event processing',
      order,
      outboxEventId: outboxEvent.id
    });
  } catch (error) {
    await transaction.rollback();
    console.error('[Order API] Error creating order:', error);
    return res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const { Order } = models;
    const orders = await Order.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { Order } = models;
    const order = await Order.findByPk(req.params.id, {
      include: ['payments']
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
