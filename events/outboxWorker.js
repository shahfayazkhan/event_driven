const models = require('../models');
const eventBus = require('./eventBus');
require('dotenv').config();

const POLL_INTERVAL = parseInt(process.env.OUTBOX_POLL_INTERVAL_MS || '1000', 10);

class OutboxWorker {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Outbox Worker] 🔄 Started Outbox Polling Worker (Interval: ${POLL_INTERVAL}ms)`);
    
    this.intervalId = setInterval(() => this.processOutboxEvents(), POLL_INTERVAL);
  }

  stop() {
    if (!this.isRunning) return;
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
    console.log('[Outbox Worker] 🛑 Stopped Outbox Worker');
  }

  async processOutboxEvents() {
    const { Outbox, sequelize } = models;
    if (!sequelize || !Outbox) return;

    let pendingEvents = [];

    // Phase 1: Lock and mark pending events as PROCESSING, then commit lock immediately
    const tx = await sequelize.transaction();
    try {
      pendingEvents = await Outbox.findAll({
        where: { status: 'PENDING' },
        order: [['createdAt', 'ASC']],
        limit: 10,
        transaction: tx
      });

      if (pendingEvents.length === 0) {
        await tx.commit();
        return;
      }

      console.log(`[Outbox Worker] 📦 Found ${pendingEvents.length} outbox event(s) to process.`);

      for (const ev of pendingEvents) {
        await ev.update({ status: 'PROCESSING' }, { transaction: tx });
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      console.error('[Outbox Worker] Error claiming outbox batch:', err.message);
      return;
    }

    // Phase 2: Dispatch events to subscribers and update final status independently
    for (const eventRecord of pendingEvents) {
      try {
        // Publish event to Event Bus
        eventBus.publish(eventRecord.eventType, {
          id: eventRecord.id,
          aggregateType: eventRecord.aggregateType,
          aggregateId: eventRecord.aggregateId,
          eventType: eventRecord.eventType,
          payload: eventRecord.payload,
          createdAt: eventRecord.createdAt
        });

        // Mark as PUBLISHED
        await Outbox.update({
          status: 'PUBLISHED',
          processedAt: new Date()
        }, { where: { id: eventRecord.id } });

        console.log(`[Outbox Worker] ✅ Successfully published & processed Outbox Event ID: ${eventRecord.id}`);
      } catch (dispatchError) {
        console.error(`[Outbox Worker] ❌ Error dispatching event ID ${eventRecord.id}:`, dispatchError.message);
        
        const newRetryCount = eventRecord.retryCount + 1;
        const newStatus = newRetryCount >= eventRecord.maxRetries ? 'FAILED' : 'PENDING';

        await Outbox.update({
          status: newStatus,
          retryCount: newRetryCount,
          lastError: dispatchError.message
        }, { where: { id: eventRecord.id } });
      }
    }
  }

  // Trigger manual processing on demand
  triggerNow() {
    setImmediate(() => this.processOutboxEvents());
  }
}

const outboxWorker = new OutboxWorker();
module.exports = outboxWorker;
