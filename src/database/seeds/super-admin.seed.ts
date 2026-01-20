import { DataSource } from 'typeorm';
import { SuperAdmin } from '../../super-admin/entities/super-admin.entity';
import { hashPassword } from '../../common/utils/password.util';

export async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
  const superAdminRepository = dataSource.getRepository(SuperAdmin);

  // Check if SuperAdmin already exists
  const existingSuperAdmin = await superAdminRepository.findOne({
    where: { email: 'admin@averox.com' },
  });

  if (existingSuperAdmin) {
    console.log('SuperAdmin already exists, skipping seed...');
    return;
  }

  // Create default SuperAdmin
  const hashedPassword = await hashPassword('Admin@123');
  const superAdmin = superAdminRepository.create({
    name: 'Super Admin',
    email: 'admin@averox.com',
    password: hashedPassword,
  });

  await superAdminRepository.save(superAdmin);
  console.log('SuperAdmin seeded successfully!');
  console.log('Email: admin@averox.com');
  console.log('Password: Admin@123');
}
