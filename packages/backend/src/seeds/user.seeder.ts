import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@exam-portal/shared';

interface SeedUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  phone?: string;
  batch?: string;
  mustChangePassword: boolean;
}

const SEED_USERS: SeedUser[] = [
  {
    email: 'admin@examportal.com',
    password: 'Admin@123',
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    phone: '9000000001',
    mustChangePassword: false,
  },
  {
    email: 'teacher@examportal.com',
    password: 'Teacher@123',
    firstName: 'Priya',
    lastName: 'Sharma',
    role: UserRole.TEACHER,
    phone: '9000000002',
    mustChangePassword: false,
  },
  ...Array.from({ length: 5 }, (_, i) => ({
    email: `student${i + 1}@examportal.com`,
    password: 'Student@123',
    firstName: `Student`,
    lastName: `${i + 1}`,
    role: UserRole.STUDENT,
    phone: `900000010${i + 1}`,
    batch: 'JEE-2026-A',
    mustChangePassword: false,
  })),
];

export async function seedUsers(userModel: Model<any>) {
  console.log('Seeding users...');

  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 12);
    await userModel.create({
      email: seedUser.email,
      passwordHash,
      firstName: seedUser.firstName,
      lastName: seedUser.lastName,
      role: seedUser.role,
      phone: seedUser.phone,
      batch: seedUser.batch,
      isActive: true,
      mustChangePassword: seedUser.mustChangePassword,
    });
    console.log(`  Created ${seedUser.role}: ${seedUser.email} / ${seedUser.password}`);
  }

  console.log(`Seeded ${SEED_USERS.length} users.`);
}
