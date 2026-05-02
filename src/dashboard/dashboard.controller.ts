import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Request,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { UsersService } from '../users/users.service';
import { OfflineTimeRequestsService } from '../offline-time-requests/offline-time-requests.service';
import {
  DashboardStatsQueryDto,
  DashboardMonthCalendarQueryDto,
} from './dto/dashboard-stats-query.dto';
import { OrganizationStatsQueryDto } from './dto/organization-stats-query.dto';
import { ColleaguesQueryDto } from './dto/colleagues-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';

/**
 * Dashboard Controller
 *
 * Provides dashboard statistics endpoints.
 * Uses JWT authentication to get tenantId and userId from authenticated user.
 * Optional query.userId (view-as): allowed only for ORG_ADMIN and SUPER_ADMIN.
 */
@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(
    private readonly dashboardService: DashboardService,
    private readonly usersService: UsersService,
    private readonly offlineTimeRequestsService: OfflineTimeRequestsService,
  ) {}

  @Get('stats')
  async getStats(
    @Query() query: DashboardStatsQueryDto,
    @Request() req: any,
  ) {
    const startTime = Date.now();
    let tenantId = req.user.tenantId as number | undefined;
    let userId = req.user.id as number;

    if (query.userId !== undefined && query.userId !== null) {
      const role = req.user.role;
      if (role !== Roles.ORG_ADMIN && role !== Roles.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Only org admins can view another user\'s dashboard',
        );
      }
      const targetUser = await this.usersService.findOne(
        query.userId,
        role === Roles.ORG_ADMIN ? req.user.tenantId : undefined,
      );
      tenantId = targetUser.tenantId;
      userId = targetUser.id;
      this.logger.log(
        `📊 Dashboard stats request (view-as) for user ${userId}, tenant ${tenantId}`,
      );
    } else {
      this.logger.log(
        `📊 Dashboard stats request from user ${userId}, tenant ${tenantId}`,
      );
    }

    if (tenantId === undefined) {
      throw new ForbiddenException(
        'Tenant context required. Use userId query to view a specific user.',
      );
    }

    try {
      const stats = await this.dashboardService.getDashboardStats(
        tenantId,
        userId,
        query.date,
        query.tz,
        query.startDate,
        query.endDate,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Dashboard stats response in ${duration}ms for user ${userId}`,
      );

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Dashboard stats request failed after ${duration}ms: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('app-usage')
  async getAppUsage(
    @Query() query: DashboardStatsQueryDto,
    @Request() req: any,
  ) {
    const startTime = Date.now();
    let tenantId = req.user.tenantId as number | undefined;
    let userId = req.user.id as number;

    if (query.userId !== undefined && query.userId !== null) {
      const role = req.user.role;
      if (role !== Roles.ORG_ADMIN && role !== Roles.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Only org admins can view another user\'s app usage',
        );
      }
      const targetUser = await this.usersService.findOne(
        query.userId,
        role === Roles.ORG_ADMIN ? req.user.tenantId : undefined,
      );
      tenantId = targetUser.tenantId;
      userId = targetUser.id;
      this.logger.log(
        `📱 App usage request (view-as) for user ${userId}, tenant ${tenantId}`,
      );
    } else {
      this.logger.log(
        `📱 App usage request from user ${userId}, tenant ${tenantId}`,
      );
    }

    if (tenantId === undefined) {
      throw new ForbiddenException(
        'Tenant context required. Use userId query to view a specific user.',
      );
    }

    try {
      const appUsage = await this.dashboardService.getAppUsageStats(
        tenantId,
        userId,
        query.date,
        query.tz,
        query.startDate,
        query.endDate,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ App usage response in ${duration}ms for user ${userId}`,
      );

      return appUsage;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ App usage request failed after ${duration}ms for user ${userId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Get('timeline')
  async getTimeline(
    @Query() query: DashboardStatsQueryDto,
    @Request() req: any,
  ) {
    const startTime = Date.now();
    let tenantId = req.user.tenantId as number | undefined;
    let userId = req.user.id as number;

    if (query.userId !== undefined && query.userId !== null) {
      const role = req.user.role;
      if (role !== Roles.ORG_ADMIN && role !== Roles.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Only org admins can view another user\'s timeline',
        );
      }
      const targetUser = await this.usersService.findOne(
        query.userId,
        role === Roles.ORG_ADMIN ? req.user.tenantId : undefined,
      );
      tenantId = targetUser.tenantId;
      userId = targetUser.id;
      this.logger.log(
        `📈 Timeline request (view-as) for user ${userId}, tenant ${tenantId}`,
      );
    } else {
      this.logger.log(
        `📈 Timeline request from user ${userId}, tenant ${tenantId}`,
      );
    }

    if (tenantId === undefined) {
      throw new ForbiddenException(
        'Tenant context required. Use userId query to view a specific user.',
      );
    }

    try {
      const slots = await this.dashboardService.getTimeline(
        tenantId,
        userId,
        query.date,
        query.tz,
        query.startDate,
        query.endDate,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Timeline response in ${duration}ms for user ${userId}`,
      );

      return slots;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Timeline request failed after ${duration}ms for user ${userId}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  @Post('tracked-time/delete')
  async deleteTrackedTime(
    @Body()
    body: {
      startAt?: string;
      endAt?: string;
    },
    @Request() req: any,
  ) {
    const tenantId = req.user.tenantId as number | undefined;
    const userId = req.user.id as number;
    if (tenantId === undefined) {
      throw new ForbiddenException('Tenant context required.');
    }

    const start = body.startAt ? new Date(body.startAt) : null;
    const end = body.endAt ? new Date(body.endAt) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('Valid startAt and endAt are required');
    }

    const result = await this.dashboardService.deleteTrackedTime(
      tenantId,
      userId,
      start.toISOString(),
      end.toISOString(),
    );
    const deletedOfflineRequests =
      await this.offlineTimeRequestsService.deletePendingForUserRange(
        tenantId,
        userId,
        start,
        end,
      );
    return { ...result, deletedOfflineRequests };
  }

  @Get('month-calendar')
  async getMonthCalendar(
    @Query() query: DashboardMonthCalendarQueryDto,
    @Request() req: any,
  ) {
    let tenantId = req.user.tenantId as number | undefined;
    let userId = req.user.id as number;

    if (query.userId !== undefined && query.userId !== null) {
      const role = req.user.role;
      if (role !== Roles.ORG_ADMIN && role !== Roles.SUPER_ADMIN) {
        throw new ForbiddenException(
          'Only org admins can view another user\'s month overview',
        );
      }
      const targetUser = await this.usersService.findOne(
        query.userId,
        role === Roles.ORG_ADMIN ? req.user.tenantId : undefined,
      );
      tenantId = targetUser.tenantId;
      userId = targetUser.id;
    }

    if (tenantId === undefined) {
      throw new ForbiddenException(
        'Tenant context required. Use userId query to view a specific user.',
      );
    }

    return this.dashboardService.getMonthCalendarStats(
      tenantId,
      userId,
      query.startDate,
      query.endDate,
      query.tz,
    );
  }

  @Get('colleagues')
  async getColleagues(
    @Query() query: ColleaguesQueryDto,
    @Request() req: any,
  ) {
    const tenantId = req.user?.tenantId as number | undefined;
    if (tenantId === undefined || tenantId === null) {
      throw new ForbiddenException(
        'Tenant context required for colleagues',
      );
    }
    return this.dashboardService.getColleagues(
      tenantId,
      req.user.id as number,
      query.windowSec,
    );
  }

  @Get('organization/stats')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  async getOrganizationStats(
    @Query() query: OrganizationStatsQueryDto,
    @Request() req: any,
  ) {
    const startTime = Date.now();
    const { tenantId } = req.user;

    this.logger.log(
      `📊 Organization dashboard stats request from tenant ${tenantId}`,
    );

    try {
      // Convert query params to the format expected by service
      const queryParams: any = {};
      if (query.date) queryParams.date = query.date;
      if (query.startDate) queryParams.startDate = query.startDate;
      if (query.endDate) queryParams.endDate = query.endDate;
      if (query.tz) queryParams.tz = query.tz;
      if (query.userId !== undefined) {
        // Handle both array and single value, convert strings to numbers
        if (Array.isArray(query.userId)) {
          queryParams.userId = query.userId.map((id) =>
            typeof id === 'string' ? parseInt(id, 10) : id,
          );
        } else {
          const userId =
            typeof query.userId === 'string'
              ? parseInt(query.userId, 10)
              : query.userId;
          queryParams.userId = [userId];
        }
      }
      if (query.teamId !== undefined) {
        // Handle both array and single value, convert strings to numbers
        if (Array.isArray(query.teamId)) {
          queryParams.teamId = query.teamId.map((id) =>
            typeof id === 'string' ? parseInt(id, 10) : id,
          );
        } else {
          const teamId =
            typeof query.teamId === 'string'
              ? parseInt(query.teamId, 10)
              : query.teamId;
          queryParams.teamId = [teamId];
        }
      }

      const stats = await this.dashboardService.getOrganizationDashboardStats(
        tenantId,
        queryParams,
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Organization dashboard stats response in ${duration}ms for tenant ${tenantId}`,
      );

      return stats;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `❌ Organization dashboard stats request failed after ${duration}ms: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
