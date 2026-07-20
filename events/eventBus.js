const EventEmitter = require('events');

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    // Increase listener limits for multiple event handlers
    this.setMaxListeners(50);
    this.sseClients = new Set();
  }

  // Register an SSE response stream for live dashboard updates
  addSseClient(res) {
    this.sseClients.add(res);
  }

  removeSseClient(res) {
    this.sseClients.delete(res);
  }

  // Broadcast event payload to all SSE clients for real-time dashboard visualization
  broadcastSse(eventName, data) {
    const payload = JSON.stringify({ event: eventName, data, timestamp: new Date().toISOString() });
    for (const client of this.sseClients) {
      try {
        client.write(`event: ${eventName}\ndata: ${payload}\n\n`);
      } catch (err) {
        console.error('[EventBus] Error writing SSE client:', err.message);
        this.sseClients.delete(client);
      }
    }
  }

  // Enhanced emit that logs and notifies subscribers & live SSE streams
  publish(eventType, eventData) {
    console.log(`[EventBus] 🚀 Publishing Event: "${eventType}" (ID: ${eventData.id || 'N/A'})`);
    
    // Broadcast to server-sent events for UI
    this.broadcastSse('DOMAIN_EVENT', {
      eventType,
      event: eventData
    });

    // Emit to internal node event listeners
    this.emit(eventType, eventData);
    this.emit('*', { eventType, eventData });
  }
}

const eventBus = new AppEventBus();
module.exports = eventBus;
