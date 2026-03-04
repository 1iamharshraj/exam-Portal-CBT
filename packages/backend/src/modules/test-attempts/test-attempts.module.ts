import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  TestAttempt,
  TestAttemptSchema,
} from './schemas/test-attempt.schema';
import { Test, TestSchema } from '../tests/schemas/test.schema';
import { TestAttemptsService } from './test-attempts.service';
import { TestAttemptsController } from './test-attempts.controller';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TestAttempt.name, schema: TestAttemptSchema },
      { name: Test.name, schema: TestSchema },
    ]),
    QuestionsModule,
  ],
  controllers: [TestAttemptsController],
  providers: [TestAttemptsService],
  exports: [TestAttemptsService],
})
export class TestAttemptsModule {}
