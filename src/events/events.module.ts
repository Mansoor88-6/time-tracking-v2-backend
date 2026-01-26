import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsHealthController } from './events-health.controller';
import { EventsService } from './events.service';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { Device } from '../devices/entities/device.entity';
import { KafkaModule } from '../queue/kafka.module';

@Module({
  imports: [TypeOrmModule.forFeature([Device]), KafkaModule],
  controllers: [EventsController, EventsHealthController],
  providers: [EventsService, DeviceAuthGuard],
  exports: [EventsService],
})
export class EventsModule {}
