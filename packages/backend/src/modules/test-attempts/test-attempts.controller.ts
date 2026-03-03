import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TestAttemptsService } from './test-attempts.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole, QuestionStatus } from '@exam-portal/shared';

@Controller('test-attempts')
@UseGuards(RolesGuard)
export class TestAttemptsController {
  constructor(private readonly attemptsService: TestAttemptsService) {}

  @Get('available-tests')
  @Roles(UserRole.STUDENT)
  getAvailableTests(@CurrentUser() user: { _id: string }) {
    return this.attemptsService.getAvailableTests(user._id);
  }

  @Get('my-attempts')
  @Roles(UserRole.STUDENT)
  getMyAttempts(@CurrentUser() user: { _id: string }) {
    return this.attemptsService.getStudentAttempts(user._id);
  }

  @Post('start')
  @Roles(UserRole.STUDENT)
  startTest(
    @Body() body: { testId: string },
    @CurrentUser() user: { _id: string },
  ) {
    return this.attemptsService.startTest(body.testId, user._id);
  }

  @Get('results/test/:testId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getTestResults(@Param('testId') testId: string) {
    return this.attemptsService.getTestResults(testId);
  }

  @Get('analytics/test/:testId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getTestAnalytics(@Param('testId') testId: string) {
    return this.attemptsService.getTestAnalytics(testId);
  }

  @Get(':id')
  @Roles(UserRole.STUDENT)
  getAttempt(
    @Param('id') id: string,
    @CurrentUser() user: { _id: string },
  ) {
    return this.attemptsService.getAttempt(id, user._id);
  }

  @Get(':id/result')
  @Roles(UserRole.STUDENT)
  getResult(
    @Param('id') id: string,
    @CurrentUser() user: { _id: string },
  ) {
    return this.attemptsService.getAttemptResult(id, user._id);
  }

  @Patch(':id/response')
  @Roles(UserRole.STUDENT)
  saveResponse(
    @Param('id') id: string,
    @Body()
    body: {
      questionId: string;
      sectionIndex: number;
      selectedOptions?: string[];
      numericalAnswer?: number;
      status: QuestionStatus;
      timeSpent: number;
    },
    @CurrentUser() user: { _id: string },
  ) {
    return this.attemptsService.saveResponse(id, user._id, body);
  }

  @Patch(':id/navigate')
  @Roles(UserRole.STUDENT)
  updateNavigation(
    @Param('id') id: string,
    @Body() body: { sectionIndex: number; questionIndex: number },
    @CurrentUser() user: { _id: string },
  ) {
    return this.attemptsService.updateNavigation(
      id,
      user._id,
      body.sectionIndex,
      body.questionIndex,
    );
  }

  @Post(':id/submit')
  @Roles(UserRole.STUDENT)
  submitTest(
    @Param('id') id: string,
    @CurrentUser() user: { _id: string },
  ) {
    return this.attemptsService.submitTest(id, user._id);
  }
}
