import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Batch, BatchSchema } from './schemas/batch.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { BatchesService } from './batches.service';
import { BatchesController } from './batches.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Batch.name, schema: BatchSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BatchesController],
  providers: [BatchesService],
  exports: [BatchesService],
})
export class BatchesModule {}
