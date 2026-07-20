const eventBus = require('../events/eventBus');
const models = require('../models');

function registerAuditSubscriber() {
  eventBus.on('*', async ({ eventType, eventData }) => {
    const { AuditLog } = models;
    if (!AuditLog) return;

    try {
      await AuditLog.create({
        eventId: eventData.id || null,
        eventType,
        sourceSubscriber: 'AuditSubscriber',
        actionSummary: `Event "${eventType}" recorded for Aggregate "${eventData.aggregateType || 'System'}" (${eventData.aggregateId || 'N/A'})`,
        metadata: eventData
      });
      console.log(`[Subscriber: AuditLog] 📝 Audit log stored for event "${eventType}"`);
    } catch (err) {
      console.error('[Subscriber: AuditLog] Failed to persist audit log:', err.message);
    }
  });
}

module.exports = registerAuditSubscriber;
