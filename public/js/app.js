document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statusIndicator = document.getElementById('connection-status');
  const refreshBtn = document.getElementById('refresh-btn');
  const orderForm = document.getElementById('order-form');
  const productNameSelect = document.getElementById('productName');
  const inventoryContainer = document.getElementById('inventory-container');
  const inventoryCount = document.getElementById('inventory-count');
  const outboxTbody = document.getElementById('outbox-tbody');
  const outboxCount = document.getElementById('outbox-count');
  const ordersTbody = document.getElementById('orders-tbody');
  const ordersCount = document.getElementById('orders-count');
  const consoleBody = document.getElementById('event-stream-console');
  const clearConsoleBtn = document.getElementById('clear-console');
  const auditContainer = document.getElementById('audit-container');
  const auditCount = document.getElementById('audit-count');

  // Pipeline Nodes
  const nodeOrder = document.getElementById('node-order');
  const nodeOutbox = document.getElementById('node-outbox');
  const nodeWorker = document.getElementById('node-worker');
  const nodeBus = document.getElementById('node-bus');
  const subChips = {
    'Inventory': document.getElementById('sub-inv'),
    'Payment': document.getElementById('sub-pay'),
    'Notification': document.getElementById('sub-notif'),
    'AuditLog': document.getElementById('sub-audit')
  };

  let eventSource = null;

  // Initialize
  fetchInventory();
  fetchOutbox();
  fetchOrders();
  fetchAuditLogs();
  initEventStream();

  // Event Listeners
  refreshBtn.addEventListener('click', refreshAll);
  clearConsoleBtn.addEventListener('click', () => {
    consoleBody.innerHTML = '<div class="console-line system-line">[System] Console cleared.</div>';
  });

  orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const productName = productNameSelect.value;
    const quantity = document.getElementById('quantity').value;

    highlightNode(nodeOrder);

    try {
      logConsole(`[Client API] 🚀 POST /api/orders (${productName} x${quantity})`, 'event-line');

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerName, customerEmail, productName, quantity })
      });

      const data = await response.json();

      if (response.ok) {
        logConsole(`[Client API] ✅ Order Created ID: ${data.order.id} | Outbox Event ID: ${data.outboxEventId}`, 'published-line');
        highlightNode(nodeOutbox);
        setTimeout(() => refreshAll(), 500);
      } else {
        logConsole(`[Client API] ❌ Error: ${data.error || data.details}`, 'error-line');
      }
    } catch (err) {
      logConsole(`[Client API] 💥 Network error: ${err.message}`, 'error-line');
    }
  });

  // Server-Sent Events (SSE) Listener
  function initEventStream() {
    eventSource = new EventSource('/api/events/stream');

    eventSource.onopen = () => {
      statusIndicator.classList.add('connected');
      statusIndicator.querySelector('.status-text').textContent = 'SSE Live Stream Active';
      logConsole('[SSE] Connected to backend live event stream', 'system-line');
    };

    eventSource.onerror = () => {
      statusIndicator.classList.remove('connected');
      statusIndicator.querySelector('.status-text').textContent = 'Reconnecting...';
    };

    eventSource.addEventListener('DOMAIN_EVENT', (e) => {
      const payload = JSON.parse(e.data);
      const { eventType, event } = payload.data;

      logConsole(`[SSE Domain Event] ⚡ ${eventType} (${event.aggregateType} #${event.aggregateId || 'N/A'})`, 'event-line');

      // Animate pipeline
      highlightNode(nodeWorker);
      highlightNode(nodeBus);

      // Highlight target subscriber chip
      if (eventType.includes('INVENTORY')) highlightChip('Inventory');
      if (eventType.includes('PAYMENT')) highlightChip('Payment');
      if (eventType.includes('ORDER')) {
        highlightChip('Notification');
        highlightChip('AuditLog');
      }

      // Auto refresh data
      setTimeout(refreshAll, 600);
    });
  }

  // Fetch Functions
  async function fetchInventory() {
    try {
      const res = await fetch('/api/inventory');
      const items = await res.json();

      inventoryCount.textContent = `${items.length} Products`;
      productNameSelect.innerHTML = items.map(item => 
        `<option value="${item.productName}">${item.productName} ($${item.unitPrice}) - Stock: ${item.availableStock}</option>`
      ).join('');

      inventoryContainer.innerHTML = items.map(item => `
        <div class="inventory-item">
          <div class="item-info">
            <h4>${item.productName}</h4>
            <p>SKU: ${item.sku} • Reserved: ${item.reservedStock}</p>
          </div>
          <div class="item-stock">
            <span class="stock-num">${item.availableStock}</span>
            <p style="font-size:0.7rem; color:var(--text-muted)">Available</p>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    }
  }

  async function fetchOutbox() {
    try {
      const res = await fetch('/api/outbox');
      const events = await res.json();

      outboxCount.textContent = `${events.length} Events`;

      if (events.length === 0) {
        outboxTbody.innerHTML = '<tr><td colspan="6" class="text-center">No outbox events recorded yet.</td></tr>';
        return;
      }

      outboxTbody.innerHTML = events.map(ev => {
        let badgeClass = 'badge-neutral';
        if (ev.status === 'PUBLISHED') badgeClass = 'badge-success';
        if (ev.status === 'PROCESSING') badgeClass = 'badge-warning';
        if (ev.status === 'FAILED') badgeClass = 'badge-danger';
        if (ev.status === 'PENDING') badgeClass = 'badge-purple';

        return `
          <tr>
            <td><strong>${ev.eventType}</strong></td>
            <td>${ev.aggregateType}</td>
            <td><span class="badge ${badgeClass}">${ev.status}</span></td>
            <td>${ev.retryCount}/${ev.maxRetries}</td>
            <td>${new Date(ev.createdAt).toLocaleTimeString()}</td>
            <td>
              ${ev.status === 'FAILED' ? `<button class="btn-xs btn-outline" onclick="retryEvent('${ev.id}')">Retry</button>` : '-'}
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to fetch outbox:', err);
    }
  }

  async function fetchOrders() {
    try {
      const res = await fetch('/api/orders');
      const orders = await res.json();

      ordersCount.textContent = `${orders.length} Orders`;

      if (orders.length === 0) {
        ordersTbody.innerHTML = '<tr><td colspan="6" class="text-center">No orders placed yet.</td></tr>';
        return;
      }

      ordersTbody.innerHTML = orders.map(ord => {
        let statusBadge = 'badge-neutral';
        if (ord.status === 'COMPLETED') statusBadge = 'badge-success';
        if (ord.status === 'INVENTORY_RESERVED') statusBadge = 'badge-info';
        if (ord.status === 'FAILED') statusBadge = 'badge-danger';

        return `
          <tr>
            <td><code>${ord.id.substring(0, 8)}...</code></td>
            <td>${ord.productName}</td>
            <td>${ord.quantity}</td>
            <td><strong>$${ord.totalAmount}</strong></td>
            <td><span class="badge ${statusBadge}">${ord.status}</span></td>
            <td>${new Date(ord.createdAt).toLocaleTimeString()}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch('/api/audit-logs');
      const logs = await res.json();

      auditCount.textContent = `${logs.length} Logs`;

      if (logs.length === 0) {
        auditContainer.innerHTML = '<div class="text-center text-muted">No audit logs yet.</div>';
        return;
      }

      auditContainer.innerHTML = logs.slice(0, 10).map(log => `
        <div class="audit-item">
          <div><strong>${log.eventType}</strong> - ${log.actionSummary}</div>
          <div class="audit-time">${new Date(log.createdAt).toLocaleTimeString()} • ${log.sourceSubscriber}</div>
        </div>
      `).join('');
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  }

  window.retryEvent = async (eventId) => {
    try {
      const res = await fetch(`/api/outbox/${eventId}/retry`, { method: 'POST' });
      const data = await res.json();
      logConsole(`[Retry] Reset event ${eventId} to PENDING`, 'event-line');
      refreshAll();
    } catch (err) {
      logConsole(`[Retry Error] ${err.message}`, 'error-line');
    }
  };

  function refreshAll() {
    fetchInventory();
    fetchOutbox();
    fetchOrders();
    fetchAuditLogs();
  }

  function logConsole(msg, type = 'system-line') {
    const div = document.createElement('div');
    div.className = `console-line ${type}`;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    consoleBody.appendChild(div);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  }

  function highlightNode(nodeEl) {
    if (!nodeEl) return;
    nodeEl.classList.add('active');
    setTimeout(() => nodeEl.classList.remove('active'), 1200);
  }

  function highlightChip(key) {
    const chip = subChips[key];
    if (!chip) return;
    chip.classList.add('active');
    setTimeout(() => chip.classList.remove('active'), 1200);
  }
});
