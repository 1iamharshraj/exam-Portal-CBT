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

// NOTE: Static routes (e.g. 'student-analytics') must be defined BEFORE
// parameterised routes (e.g. ':id') so NestJS doesn't treat the path
// segment as an :id parameter.

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
  async getTestAnalytics(@Param('testId') testId: string) {
    try {
      return await this.attemptsService.getTestAnalytics(testId);
    } catch (err) {
      console.error('Analytics error:', err);
      throw err;
    }
  }

  @Get('student-analytics')
  @Roles(UserRole.STUDENT)
  getStudentAnalytics(@CurrentUser() user: { _id: string }) {
    return this.attemptsService.getStudentPerformanceAnalytics(user._id);
  }

  @Get('leaderboard/test/:testId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT)
  getLeaderboard(@Param('testId') testId: string) {
    return this.attemptsService.getLeaderboard(testId);
  }

  @Get('student-rankings')
  @Roles(UserRole.STUDENT)
  getStudentRankings(@CurrentUser() user: { _id: string }) {
    return this.attemptsService.getStudentRankings(user._id);
  }

  @Get('live-status/test/:testId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  getLiveTestStatus(@Param('testId') testId: string) {
    return this.attemptsService.getLiveTestStatus(testId);
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

  @Patch(':id/violation')
  @Roles(UserRole.STUDENT)
  recordViolation(
    @Param('id') id: string,
    @Body() body: { type: string; message: string },
    @CurrentUser() user: { _id: string },
  ) {
    return this.attemptsService.recordViolation(
      id,
      user._id,
      body.type,
      body.message,
    );
  }

  @Post(':id/force-submit')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.TEACHER)
  forceSubmitAttempt(@Param('id') id: string) {
    return this.attemptsService.forceSubmitAttempt(id);
  }
}
