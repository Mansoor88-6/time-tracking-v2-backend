import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { BatchEventDto } from './dto/batch-event.dto';
import { DeviceAuthGuard } from './guards/device-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/v1/events')
@Public() // Bypass JWT auth, use device-based auth instead
@UseGuards(DeviceAuthGuard)
export class EventsController {
  private readonly logger = new Logger(EventsController.name);

  constructor(private readonly eventsService: EventsService) {}

  @Post('batch')
  @HttpCode(HttpStatus.ACCEPTED) // 202 Accepted - async processing
  async ingestBatch(
    @Body() batchDto: BatchEventDto,
    @Request() req: any,
  ): Promise<{ message: string; batchId: number }> {
    const startTime = Date.now();
    const { tenantId, user, device } = req;

    this.logger.log(
      `Received batch of ${batchDto.events.length} events from device ${batchDto.deviceId}`,
    );

    try {
      // Fast validation (should be < 50ms)
      await this.eventsService.validateBatch(
        batchDto,
        tenantId,
        user.id,
      );

      // Publish to Kafka (non-blocking, returns immediately)
      await this.eventsService.publishToQueue(
        batchDto,
        tenantId,
        user.id,
        device.deviceId,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Batch accepted in ${processingTime}ms for device ${batchDto.deviceId}`,
      );

      return {
        message: 'Batch accepted for processing',
        batchId: batchDto.batchTimestamp,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Failed to process batch in ${processingTime}ms: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
