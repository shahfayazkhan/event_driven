const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const eventController = require('../controllers/eventController');
const inventoryController = require('../controllers/inventoryController');

// Order endpoints
router.post('/orders', orderController.createOrder);
router.get('/orders', orderController.getOrders);
router.get('/orders/:id', orderController.getOrderById);

// Inventory endpoints
router.get('/inventory', inventoryController.getInventory);
router.patch('/inventory/:id', inventoryController.updateStock);

// Outbox & Event endpoints
router.get('/outbox', eventController.getOutboxEvents);
router.post('/outbox/:id/retry', eventController.retryFailedEvent);
router.get('/audit-logs', eventController.getAuditLogs);

// Real-time Event Stream endpoint
router.get('/events/stream', eventController.streamEvents);

module.exports = router;
