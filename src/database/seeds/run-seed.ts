import { DataSource } from 'typeorm';
import { seedSuperAdmin } from './super-admin.seed';
import { config } from 'dotenv';

// Load environment variables
config();

async function runSeed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'pki_multi_tenant',
    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
    synchronize: true, // Enable synchronize to create tables before seeding
  });

  try {
    await dataSource.initialize();
    console.log('Database connection established');

    await seedSuperAdmin(dataSource);

    await dataSource.destroy();
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Error running seed:', error);
    await dataSource.destroy();
    process.exit(1);
  }
}

runSeed();
