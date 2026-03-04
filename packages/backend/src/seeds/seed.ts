import * as mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { seedUsers } from './user.seeder';
import { seedQuestions } from './question.seeder';

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

const QuestionSchema = new mongoose.Schema(
  {
    questionText: { type: String, required: true },
    questionType: { type: String, required: true, enum: ['MCQ_SINGLE', 'MCQ_MULTIPLE', 'NUMERICAL', 'ASSERTION_REASON'] },
    options: [{ text: String, isCorrect: Boolean }],
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    subject: { type: String, required: true },
    topic: { type: String, required: true },
    subtopic: String,
    difficultyLevel: { type: String, required: true, enum: ['EASY', 'MEDIUM', 'HARD'] },
    marks: { type: Number, default: 4 },
    negativeMarks: { type: Number, default: 1 },
    explanation: String,
    tags: [String],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'questions' },
);

async function runSeed() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/exam-portal';
  console.log(`Connecting to MongoDB: ${uri}`);

  await mongoose.connect(uri);
  console.log('Connected to MongoDB.');

  const UserModel = mongoose.model('User', UserSchema);
  const QuestionModel = mongoose.model('Question', QuestionSchema);

  // Clear existing data
  await QuestionModel.deleteMany({});
  console.log('Cleared existing questions.');

  await UserModel.deleteMany({});
  console.log('Cleared existing users.');

  const RefreshTokenModel = mongoose.connection.collection('refresh_tokens');
  await RefreshTokenModel.deleteMany({});
  console.log('Cleared existing refresh tokens.');

  // Seed users
  await seedUsers(UserModel);

  // Get the teacher user for question ownership
  const teacher = await UserModel.findOne({ role: 'TEACHER' });
  if (teacher) {
    await seedQuestions(QuestionModel, teacher._id);
  } else {
    console.log('No teacher found, skipping question seed.');
  }

  await mongoose.disconnect();
  console.log('\nSeed complete. Disconnected from MongoDB.');
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
