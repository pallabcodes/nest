// Load .env file based on NODE_ENV: if NODE_ENV is set, use .env.${NODE_ENV}, otherwise use .env
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
require('dotenv').config({ path: envFile });

// Determine database dialect from environment variable, default to MySQL
const dbDialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();
const isPostgres = dbDialect === 'postgres' || dbDialect === 'postgresql';
const dialect = isPostgres ? 'postgres' : 'mysql';
const defaultPort = isPostgres ? 5432 : 3308;
const defaultUsername = isPostgres ? 'postgres' : 'root';

module.exports = {
  development: {
    username: process.env.DB_USERNAME || defaultUsername,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sandbox_db',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || String(defaultPort), 10),
    dialect: dialect,
    logging: console.log,
  },
  test: {
    username: process.env.DB_USERNAME || defaultUsername,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sandbox_db_test',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || String(defaultPort), 10),
    dialect: dialect,
    logging: false,
  },
  production: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || String(defaultPort), 10),
    dialect: dialect,
    logging: false,
  },
};
