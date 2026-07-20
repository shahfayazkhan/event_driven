const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabaseConnection } = require('./config/database');
const models = require('./models');
const { initSubscribers } = require('./subscribers');
const outboxWorker = require('./events/outboxWorker');
const apiRoutes = require('./routes/api');

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// Seed initial stock if inventory is empty
async function seedInitialInventory() {
  const { Inventory } = models;
  const count = await Inventory.count();
  if (count === 0) {
    console.log('[Seed] 📦 Seeding initial inventory items...');
    await Inventory.bulkCreate([
      { productName: 'MacBook Pro M3 Max', sku: 'MBP-M3-001', availableStock: 25, reservedStock: 0, unitPrice: 2499.99 },
      { productName: 'iPhone 15 Pro Max', sku: 'IPH-15-002', availableStock: 50, reservedStock: 0, unitPrice: 1199.99 },
      { productName: 'Sony WH-1000XM5 Headphones', sku: 'SNY-XM5-003', availableStock: 100, reservedStock: 0, unitPrice: 399.99 },
      { productName: 'UltraWide Curved Monitor 34"', sku: 'MON-34-004', availableStock: 5, reservedStock: 0, unitPrice: 799.99 }
    ]);
    console.log('[Seed] ✅ Inventory items seeded successfully.');
  }
}

function listenWithPortFallback(startPort, maxAttempts = 10) {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;
    let attempts = 0;

    const tryListen = () => {
      attempts++;
      const server = app.listen(currentPort, () => {
        resolve({ server, port: currentPort });
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
          console.warn(`[Server] Port ${currentPort} is busy. Trying port ${currentPort + 1}...`);
          currentPort++;
          tryListen();
        } else {
          reject(err);
        }
      });
    };

    tryListen();
  });
}

// Start Server
async function startServer() {
  try {
    console.log('--------------------------------------------------');
    console.log('⚡ Starting Event-Driven Engine...');
    console.log('--------------------------------------------------');

    // 1. Initialize DB Connection
    const activeDb = await initDatabaseConnection();

    // 2. Initialize Models with the active DB connection
    models.initModels(activeDb);

    // 3. Sync Models with DB schema
    await activeDb.sync();
    console.log('[Database] 🗄️ Schema synchronized.');

    // 4. Seed Initial Inventory Data
    await seedInitialInventory();

    // 5. Register Event Subscribers
    initSubscribers();

    // 6. Start Transactional Outbox Processor
    outboxWorker.start();

    // 7. Start Express HTTP Server with port fallback
    const { port } = await listenWithPortFallback(DEFAULT_PORT);
    console.log(`==================================================`);
    console.log(`🚀 Event-Driven Server running on http://localhost:${port}`);
    console.log(`==================================================`);
  } catch (error) {
    console.error('💥 Fatal error starting server:', error);
    process.exit(1);
  }
}

startServer();
