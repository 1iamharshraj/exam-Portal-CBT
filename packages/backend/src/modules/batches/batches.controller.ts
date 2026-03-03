import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@exam-portal/shared';

@Controller('batches')
@UseGuards(RolesGuard)
export class BatchesController {
  constructor(private readonly batchesService: BatchesService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() createBatchDto: CreateBatchDto, @CurrentUser('_id') userId: string) {
    return this.batchesService.create(createBatchDto, userId);
  }

  @Patch('bulk-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async bulkUpdateStatus(@Body() body: { ids: string[]; isActive: boolean }) {
    const count = await this.batchesService.bulkUpdateStatus(body.ids, body.isActive);
    return { modifiedCount: count };
  }

  @Delete('bulk-delete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async bulkDelete(@Body() body: { ids: string[] }) {
    const count = await this.batchesService.bulkDelete(body.ids);
    return { deletedCount: count };
  }

  @Get('codes')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getCodes() {
    return this.batchesService.getAllCodes();
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.batchesService.findAll({
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findOne(@Param('id') id: string) {
    return this.batchesService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateBatchDto: UpdateBatchDto) {
    return this.batchesService.update(id, updateBatchDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.batchesService.delete(id);
  }
}
