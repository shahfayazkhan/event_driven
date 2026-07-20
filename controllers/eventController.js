const models = require('../models');
const eventBus = require('../events/eventBus');
const outboxWorker = require('../events/outboxWorker');

exports.getOutboxEvents = async (req, res) => {
  try {
    const { Outbox } = models;
    const events = await Outbox.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    return res.json(events);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getAuditLogs = async (req, res) => {
  try {
    const { AuditLog } = models;
    const logs = await AuditLog.findAll({
      order: [['createdAt', 'DESC']],
      limit: 100
    });
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.retryFailedEvent = async (req, res) => {
  try {
    const { Outbox } = models;
    const { id } = req.params;
    const event = await Outbox.findByPk(id);

    if (!event) {
      return res.status(404).json({ error: 'Outbox event not found' });
    }

    await event.update({
      status: 'PENDING',
      retryCount: 0,
      lastError: null
    });

    outboxWorker.triggerNow();

    return res.json({ message: 'Event reset to PENDING for retry', event });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// SSE Stream Controller for live client connection
exports.streamEvents = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial ping to establish SSE
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Real-time Event Stream Connected' })}\n\n`);

  eventBus.addSseClient(res);

  req.on('close', () => {
    eventBus.removeSseClient(res);
    res.end();
  });
};
