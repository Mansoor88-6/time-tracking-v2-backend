import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfflineTimeRequest } from './entities/offline-time-request.entity';
import { OfflineTimeRequestsService } from './offline-time-requests.service';
import { OfflineTimeRequestsController } from './offline-time-requests.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfflineTimeRequest]),
    TenantsModule,
  ],
  controllers: [OfflineTimeRequestsController],
  providers: [OfflineTimeRequestsService],
  exports: [OfflineTimeRequestsService],
})
export class OfflineTimeRequestsModule {}
