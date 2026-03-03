import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { seedUsers } from './user.seeder';

dotenv.config({ path: resolve(__dirname, '../../.env') });

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, required: true, enum: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STUDENT'] },
    phone: { type: String, trim: true },
    batch: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: true },
    passwordResetToken: String,
    passwordResetExpires: Date,
  },
  { timestamps: true, collection: 'users' },
);

async function runSeed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-portal';
  console.log(`Connecting to MongoDB: ${uri}`);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const UserModel = mongoose.model('User', UserSchema);

  // Clear existing data
  await UserModel.deleteMany({});
  console.log('Cleared existing users.');

  const RefreshTokenModel = mongoose.connection.collection('refresh_tokens');
  await RefreshTokenModel.deleteMany({});
  console.log('Cleared existing refresh tokens.');

  // Seed
  await seedUsers(UserModel);

  await mongoose.disconnect();
  console.log('Seed complete. Disconnected from MongoDB.');
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
