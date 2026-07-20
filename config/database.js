const { Sequelize } = require('sequelize');
require('dotenv').config();

let dbInstance = null;

function getSequelize() {
  if (!dbInstance) {
    const dbDialect = process.env.DB_DIALECT || 'postgres';
    if (dbDialect === 'postgres') {
      dbInstance = new Sequelize(
        process.env.DB_NAME || 'event_driven_db',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'postgres',
        {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          dialect: 'postgres',
          logging: false,
          pool: { max: 10, min: 0, acquire: 30000, idle: 10000 }
        }
      );
    } else {
      dbInstance = createSqliteInstance();
    }
  }
  return dbInstance;
}

function createSqliteInstance() {
  return new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false
  });
}

// Proxy object so models always reference the current active database instance
const sequelizeProxy = new Proxy({}, {
  get(target, prop) {
    const instance = getSequelize();
    const value = instance[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

async function initDatabaseConnection() {
  const instance = getSequelize();
  try {
    await instance.authenticate();
    console.log(`[Database] Connected successfully using ${instance.getDialect().toUpperCase()} dialect.`);
    return instance;
  } catch (error) {
    if (instance.getDialect() === 'postgres') {
      console.warn(`[Database] PostgreSQL connection failed ("${error.message}"). Switching to SQLite fallback...`);
      dbInstance = createSqliteInstance();
      await dbInstance.authenticate();
      console.log(`[Database] Connected successfully using SQLite fallback.`);
      return dbInstance;
    }
    throw error;
  }
}

module.exports = {
  sequelize: sequelizeProxy,
  getSequelize,
  initDatabaseConnection
};
