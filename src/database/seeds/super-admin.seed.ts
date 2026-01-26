import { DataSource } from 'typeorm';
import { SuperAdmin } from '../../super-admin/entities/super-admin.entity';
import { hashPassword } from '../../common/utils/password.util';

export async function seedSuperAdmin(dataSource: DataSource): Promise<void> {
  const superAdminRepository = dataSource.getRepository(SuperAdmin);

  const email = process.env.SUPER_ADMIN_EMAIL || 'admin@averox.com';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin@123';

  // Check if SuperAdmin already exists
  const existingSuperAdmin = await superAdminRepository.findOne({
    where: { email },
  });

  if (existingSuperAdmin) {
    console.log('SuperAdmin already exists, skipping seed...');
    return;
  }

  // Create default SuperAdmin
  const hashedPassword = await hashPassword(password);
  const superAdmin = superAdminRepository.create({
    name: 'Super Admin',
    email,
    password: hashedPassword,
  });

  await superAdminRepository.save(superAdmin);
  console.log('SuperAdmin seeded successfully!');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}
