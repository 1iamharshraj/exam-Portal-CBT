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
import { TestsService } from './tests.service';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@exam-portal/shared';

@Controller('tests')
@UseGuards(RolesGuard)
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  create(
    @Body() dto: CreateTestDto,
    @CurrentUser() user: { _id: string },
  ) {
    return this.testsService.create(dto, user._id);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findAll(
    @Query('status') status?: string,
    @Query('examType') examType?: string,
    @Query('search') search?: string,
    @Query('createdBy') createdBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.testsService.findAll({
      status,
      examType,
      search,
      createdBy,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findOne(@Param('id') id: string) {
    return this.testsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  update(@Param('id') id: string, @Body() dto: UpdateTestDto) {
    return this.testsService.update(id, dto);
  }

  @Patch(':id/sections/:sectionIndex/questions')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  updateSectionQuestions(
    @Param('id') id: string,
    @Param('sectionIndex') sectionIndex: string,
    @Body() body: { questionIds: string[] },
  ) {
    return this.testsService.updateSectionQuestions(
      id,
      parseInt(sectionIndex, 10),
      body.questionIds,
    );
  }

  @Post(':id/sections/:sectionIndex/auto-pick')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  autoPickQuestions(
    @Param('id') id: string,
    @Param('sectionIndex') sectionIndex: string,
    @Body() body: { subject?: string; topic?: string; difficultyLevel?: string; count: number },
  ) {
    return this.testsService.autoPickQuestions(
      id,
      parseInt(sectionIndex, 10),
      body,
    );
  }

  @Patch(':id/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  publish(@Param('id') id: string) {
    return this.testsService.publish(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.testsService.delete(id);
  }
}
