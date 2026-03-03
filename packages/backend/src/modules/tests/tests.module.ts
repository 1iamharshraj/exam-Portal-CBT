import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, TestSchema } from './schemas/test.schema';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { QuestionsModule } from '../questions/questions.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Test.name, schema: TestSchema }]),
    QuestionsModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
