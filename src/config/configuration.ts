export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  database: {
    host: process.env.DB_HOST || '15.235.206.77',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    name: process.env.DB_NAME || 'time-tracking',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  kafka: {
    broker: process.env.KAFKA_BROKER || '51.91.156.207:9092',
    clientId: process.env.KAFKA_CLIENT_ID || 'time-tracking-api',
    groupId: process.env.KAFKA_GROUP_ID || 'events-producer',
    topicRawEvents: process.env.KAFKA_TOPIC_RAW_EVENTS || 'raw-events',
  },
  worker: {
    serviceUrl:
      process.env.WORKER_SERVICE_URL || 'http://localhost:3300',
    internalKey:
      process.env.WORKER_INTERNAL_KEY || 'change-me-in-production',
    requestTimeoutMs: parseInt(
      process.env.WORKER_REQUEST_TIMEOUT_MS || '5000',
      10,
    ),
  },
});
