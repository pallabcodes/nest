export default () => {
  // Determine database dialect from environment variable, default to MySQL
  const dbDialect = (process.env.DB_DIALECT || 'mysql').toLowerCase();
  const isPostgres = dbDialect === 'postgres' || dbDialect === 'postgresql';

  // Set default port based on dialect
  const defaultPort = isPostgres ? 5432 : 3306;
  const defaultUsername = isPostgres ? 'postgres' : 'root';

  return {
    port: parseInt(process.env.PORT || '8000', 10),
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || String(defaultPort), 10),
      username: process.env.DB_USERNAME || defaultUsername,
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sandbox_db',
      dialect: dbDialect === 'postgres' || dbDialect === 'postgresql' ? 'postgres' : 'mysql',
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      retry: {
        max: 10,
        delay: 2000,
      },
    },
    jwt: {
      secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      accessTokenExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
      refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    },
    bcrypt: {
      rounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    },
    otp: {
      expiration: parseInt(process.env.OTP_EXPIRATION || '600000', 10), // 10 minutes
      length: parseInt(process.env.OTP_LENGTH || '6', 10),
    },
    app: {
      name: process.env.APP_NAME || 'Interview Sandbox API',
      env: process.env.NODE_ENV || 'development',
    },
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
    security: {
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // requests per window
        enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      },
      helmet: {
        enabled: process.env.HELMET_ENABLED !== 'false',
        contentSecurityPolicy: process.env.CSP_ENABLED !== 'false',
        hsts: {
          enabled: process.env.HSTS_ENABLED !== 'false',
          maxAge: parseInt(process.env.HSTS_MAX_AGE || '31536000', 10),
        },
      },
    },
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      enableFileLogging: process.env.LOG_FILE_ENABLED !== 'false',
      enableConsoleLogging: process.env.LOG_CONSOLE_ENABLED !== 'false',
      logDirectory: process.env.LOG_DIRECTORY || 'logs',
      maxFiles: process.env.LOG_MAX_FILES || '14d', // Keep logs for 14 days by default
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      enableScheduledDeletion: process.env.LOG_SCHEDULED_DELETION === 'true', // Opt-out by default
      deletionSchedule: process.env.LOG_DELETION_SCHEDULE || '1w', // 1 week, 1 month, etc.
    },
    cache: {
      enabled: process.env.CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default
      keyPrefix: process.env.CACHE_KEY_PREFIX || 'cache:',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '',
        db: parseInt(process.env.REDIS_DB || '0', 10),
      },
    },
  };
};
