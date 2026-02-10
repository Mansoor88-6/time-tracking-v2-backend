import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardStatsQueryDto } from './dto/dashboard-stats-query.dto';
import { OrganizationStatsQueryDto } from './dto/organization-stats-query.dto';
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
 */
@Controller('api/v1/dashboard')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getStats(
    @Query() query: DashboardStatsQueryDto,
    @Request() req: any,
  ) {
    const startTime = Date.now();
    const { tenantId, id: userId } = req.user;

    this.logger.log(
      `📊 Dashboard stats request from user ${userId}, tenant ${tenantId}`,
    );

    try {
      const stats = await this.dashboardService.getDashboardStats(
        tenantId,
        userId,
        query.date,
        query.tz,
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
    const { tenantId, id: userId } = req.user;

    this.logger.log(
      `📱 App usage request from user ${userId}, tenant ${tenantId}`,
    );

    try {
      const appUsage = await this.dashboardService.getAppUsageStats(
        tenantId,
        userId,
        query.date,
        query.tz,
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
