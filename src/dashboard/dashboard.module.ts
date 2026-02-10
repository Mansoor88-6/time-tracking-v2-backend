import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { TeamsModule } from '../teams/teams.module';

/**
 * Dashboard Module
 *
 * Provides dashboard statistics endpoints that proxy requests to the worker service.
 */
@Module({
  imports: [ConfigModule, TenantsModule, UsersModule, TeamsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
