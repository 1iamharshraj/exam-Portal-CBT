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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@exam-portal/shared';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  bulkImport(
    @Body() body: { users: Array<{ email: string; firstName: string; lastName: string; role: string; phone?: string; batch?: string }> },
  ) {
    return this.usersService.bulkCreate(body.users);
  }

  @Patch('bulk-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async bulkUpdateStatus(@Body() bulkActionDto: BulkActionDto) {
    const count = await this.usersService.bulkUpdateStatus(
      bulkActionDto.ids,
      bulkActionDto.isActive ?? true,
    );
    return { modifiedCount: count };
  }

  @Delete('bulk-delete')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async bulkDelete(@Body() body: { ids: string[] }) {
    const count = await this.usersService.bulkDelete(body.ids);
    return { deletedCount: count };
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findAll(
    @Query('role') role?: string,
    @Query('batch') batch?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.usersService.findAll({
      role,
      batch,
      status,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}
