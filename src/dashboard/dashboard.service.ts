import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { TeamsService } from '../teams/teams.service';

/**
 * Dashboard Service
 *
 * Proxies dashboard statistics requests to the worker service.
 * Handles authentication, error mapping, and timeout management.
 */
@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly workerServiceUrl: string;
  private readonly workerInternalKey: string;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly teamsService: TeamsService,
  ) {
    this.workerServiceUrl =
      this.configService.get<string>('worker.serviceUrl') ||
      process.env.WORKER_SERVICE_URL ||
      'http://localhost:3300';

    this.workerInternalKey =
      this.configService.get<string>('worker.internalKey') ||
      process.env.WORKER_INTERNAL_KEY ||
      'change-me-in-production';

    this.requestTimeoutMs =
      parseInt(
        this.configService.get<string>('worker.requestTimeoutMs') ||
          process.env.WORKER_REQUEST_TIMEOUT_MS ||
          '5000',
        10,
      ) || 5000;
  }

  /**
   * Get dashboard stats from worker service
   *
   * @param tenantId - Tenant ID from authenticated user
   * @param userId - User ID from authenticated user
   * @param date - Date string in YYYY-MM-DD format (optional, defaults to today)
   * @param timezone - IANA timezone (optional)
   * @param startDate - Start date string in YYYY-MM-DD format (for date range)
   * @param endDate - End date string in YYYY-MM-DD format (for date range)
   * @returns Dashboard statistics from worker service
   */
  async getDashboardStats(
    tenantId: number,
    userId: number,
    date?: string,
    timezone?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const startTime = Date.now();

    // Default to today's date if not provided (only if no date range)
    const targetDate = date || (startDate && endDate ? undefined : this.getTodayDateString());

    this.logger.log(
      `📊 Dashboard stats request: tenant=${tenantId}, user=${userId}, date=${targetDate || 'N/A'}, startDate=${startDate || 'N/A'}, endDate=${endDate || 'N/A'}, tz=${timezone || 'UTC'}`,
    );

    try {
      // Build query parameters
      const queryParams = new URLSearchParams({
        tenantId: tenantId.toString(),
        userId: userId.toString(),
      });

      if (targetDate) {
        queryParams.append('date', targetDate);
      }
      if (startDate) {
        queryParams.append('startDate', startDate);
      }
      if (endDate) {
        queryParams.append('endDate', endDate);
      }
      if (timezone) {
        queryParams.append('tz', timezone);
      }

      const url = `${this.workerServiceUrl}/internal/stats/summary?${queryParams.toString()}`;

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs,
      );

      console.log('url', url);
      console.log('workerInternalKey', this.workerInternalKey);

      try {
        // Make request to worker service
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Worker-Key': this.workerInternalKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(
            `❌ Worker service returned error ${response.status} after ${duration}ms: ${errorText}`,
          );

          if (response.status === 401) {
            throw new HttpException(
              'Worker service authentication failed',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          } else if (response.status === 503 || response.status >= 500) {
            throw new ServiceUnavailableException(
              'Worker service is temporarily unavailable',
            );
          } else {
            throw new HttpException(
              `Worker service error: ${errorText}`,
              response.status,
            );
          }
        }

        const data = await response.json();
        console.log('response from worker for dashboard stats', data);
        this.logger.log(
          `✅ Dashboard stats retrieved in ${duration}ms for tenant ${tenantId}, user ${userId}`,
        );

        return data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        if (fetchError.name === 'AbortError') {
          this.logger.error(
            `❌ Worker service request timed out after ${this.requestTimeoutMs}ms`,
          );
          throw new ServiceUnavailableException(
            'Worker service request timed out',
          );
        }

        if (fetchError instanceof HttpException) {
          throw fetchError;
        }

        // Network or other errors
        this.logger.error(
          `❌ Failed to connect to worker service after ${duration}ms: ${fetchError.message}`,
          fetchError.stack,
        );
        throw new ServiceUnavailableException(
          'Unable to connect to worker service',
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `❌ Dashboard stats request failed after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to retrieve dashboard statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get today's date string in YYYY-MM-DD format
   */
  /**
   * Get app usage stats from worker service
   *
   * @param tenantId - Tenant ID from authenticated user
   * @param userId - User ID from authenticated user
   * @param date - Date string in YYYY-MM-DD format (optional, defaults to today)
   * @param timezone - IANA timezone (optional)
   * @returns App usage statistics from worker service
   */
  async getAppUsageStats(
    tenantId: number,
    userId: number,
    date?: string,
    timezone?: string,
  ): Promise<any> {
    const startTime = Date.now();
    const targetDate = date || this.getTodayDateString();

    this.logger.log(
      `📱 App usage request: tenant=${tenantId}, user=${userId}, date=${targetDate}, tz=${timezone || 'UTC'}`,
    );

    try {
      const queryParams = new URLSearchParams({
        tenantId: tenantId.toString(),
        userId: userId.toString(),
        date: targetDate,
      });

      if (timezone) {
        queryParams.append('tz', timezone);
      }

      const url = `${this.workerServiceUrl}/internal/stats/app-usage?${queryParams.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.requestTimeoutMs,
      );

      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'X-Worker-Key': this.workerInternalKey,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const duration = Date.now() - startTime;

        if (!response.ok) {
          const errorText = await response.text();
          this.logger.error(
            `❌ Worker service returned error ${response.status} after ${duration}ms: ${errorText}`,
          );

          if (response.status === 401) {
            throw new HttpException(
              'Worker service authentication failed',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
          } else if (response.status === 503 || response.status >= 500) {
            throw new ServiceUnavailableException(
              'Worker service is temporarily unavailable',
            );
          } else {
            throw new HttpException(
              `Worker service error: ${errorText}`,
              response.status,
            );
          }
        }

        const data = await response.json();
        this.logger.log(
          `✅ App usage stats retrieved in ${duration}ms for tenant ${tenantId}, user ${userId}`,
        );

        return data;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;

        if (fetchError.name === 'AbortError') {
          this.logger.error(
            `❌ Worker service request timed out after ${this.requestTimeoutMs}ms`,
          );
          throw new ServiceUnavailableException(
            'Worker service request timed out',
          );
        }

        if (fetchError instanceof HttpException) {
          throw fetchError;
        }

        this.logger.error(
          `❌ Failed to connect to worker service after ${duration}ms: ${fetchError.message}`,
          fetchError.stack,
        );
        throw new ServiceUnavailableException(
          'Unable to connect to worker service',
        );
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `❌ App usage request failed after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to retrieve app usage statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get organization dashboard stats aggregated across multiple users
   *
   * @param tenantId - Tenant ID from authenticated user
   * @param query - Query parameters with filters (date range, user IDs, team IDs)
   * @returns Aggregated stats and per-user breakdown
   */
  async getOrganizationDashboardStats(
    tenantId: number,
    query: {
      date?: string;
      startDate?: string;
      endDate?: string;
      tz?: string;
      userId?: number[];
      teamId?: number[];
    },
  ): Promise<any> {
    const startTime = Date.now();

    this.logger.log(
      `📊 Organization dashboard stats request: tenant=${tenantId}, filters=${JSON.stringify(query)}`,
    );

    try {
      // Get all users in the tenant
      let allUsers = await this.usersService.findAll(tenantId);

      // Filter by user IDs if provided
      if (query.userId && query.userId.length > 0) {
        allUsers = allUsers.filter((user) => query.userId!.includes(user.id));
      }

      // Filter by team IDs if provided
      if (query.teamId && query.teamId.length > 0) {
        const teamMemberUserIds = new Set<number>();
        for (const teamId of query.teamId) {
          const members = await this.teamsService.getTeamMembers(
            tenantId,
            teamId,
          );
          members.forEach((member) => teamMemberUserIds.add(member.userId));
        }
        allUsers = allUsers.filter((user) => teamMemberUserIds.has(user.id));
      }

      if (allUsers.length === 0) {
        return {
          aggregated: {
            totalProductiveTimeMs: 0,
            totalDeskTimeMs: 0,
            totalTimeAtWorkMs: 0,
            totalProjectsTimeMs: 0,
            averageProductivityScore: 0,
            averageEffectiveness: 0,
            totalUsers: 0,
            activeUsers: 0,
          },
          users: [],
        };
      }

      // Get stats for each user
      const userStatsPromises = allUsers.map(async (user) => {
        try {
          // Use date range if provided, otherwise use single date
          const stats = await this.getDashboardStats(
            tenantId,
            user.id,
            query.date,
            query.tz,
            query.startDate,
            query.endDate,
          );

          return {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            stats,
          };
        } catch (error) {
          this.logger.warn(
            `Failed to get stats for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // Return zero stats for failed users
          return {
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            stats: {
              productiveTimeMs: 0,
              deskTimeMs: 0,
              timeAtWorkMs: 0,
              projectsTimeMs: 0,
              productivityScorePct: 0,
              effectivenessPct: 0,
              isOnline: false,
            },
          };
        }
      });

      const userStats = await Promise.all(userStatsPromises);

      // Aggregate stats
      const aggregated = {
        totalProductiveTimeMs: userStats.reduce(
          (sum, u) => sum + (u.stats.productiveTimeMs || 0),
          0,
        ),
        totalDeskTimeMs: userStats.reduce(
          (sum, u) => sum + (u.stats.deskTimeMs || 0),
          0,
        ),
        totalTimeAtWorkMs: userStats.reduce(
          (sum, u) => sum + (u.stats.timeAtWorkMs || 0),
          0,
        ),
        totalProjectsTimeMs: userStats.reduce(
          (sum, u) => sum + (u.stats.projectsTimeMs || 0),
          0,
        ),
        averageProductivityScore:
          userStats.length > 0
            ? userStats.reduce(
                (sum, u) => sum + (u.stats.productivityScorePct || 0),
                0,
              ) / userStats.length
            : 0,
        averageEffectiveness:
          userStats.length > 0
            ? userStats.reduce(
                (sum, u) => sum + (u.stats.effectivenessPct || 0),
                0,
              ) / userStats.length
            : 0,
        totalUsers: userStats.length,
        activeUsers: userStats.filter((u) => u.stats.isOnline).length,
      };

      const duration = Date.now() - startTime;
      this.logger.log(
        `✅ Organization dashboard stats retrieved in ${duration}ms for tenant ${tenantId}`,
      );

      return {
        aggregated,
        users: userStats,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `❌ Organization dashboard stats request failed after ${duration}ms: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        'Failed to retrieve organization dashboard statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private getTodayDateString(): string {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
