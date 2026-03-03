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
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@exam-portal/shared';

@Controller('questions')
@UseGuards(RolesGuard)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  create(
    @Body() dto: CreateQuestionDto,
    @CurrentUser() user: { _id: string },
  ) {
    return this.questionsService.create(dto, user._id);
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  bulkImport(
    @Body() body: { questions: CreateQuestionDto[] },
    @CurrentUser() user: { _id: string },
  ) {
    return this.questionsService.bulkCreate(body.questions, user._id);
  }

  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getStats(@CurrentUser() user: { _id: string; role: string }) {
    const userId =
      user.role === UserRole.TEACHER ? user._id : undefined;
    return this.questionsService.getStats(userId);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findAll(
    @Query('subject') subject?: string,
    @Query('topic') topic?: string,
    @Query('subtopic') subtopic?: string,
    @Query('questionType') questionType?: string,
    @Query('difficultyLevel') difficultyLevel?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('createdBy') createdBy?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.questionsService.findAll({
      subject,
      topic,
      subtopic,
      questionType,
      difficultyLevel,
      search,
      tags,
      createdBy,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  findOne(@Param('id') id: string) {
    return this.questionsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.questionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  remove(@Param('id') id: string) {
    return this.questionsService.delete(id);
  }
}
