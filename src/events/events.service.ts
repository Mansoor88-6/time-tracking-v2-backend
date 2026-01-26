import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { BatchEventDto } from './dto/batch-event.dto';
import { EventDto, EventStatus } from './dto/event.dto';

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private readonly maxBatchSize = 1000;
  private readonly maxTimestampAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
  private readonly maxTimestampFuture = 5 * 60 * 1000; // 5 minutes in ms

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Connect to Kafka
    await this.kafkaClient.connect();
    this.logger.log('Connected to Kafka');
  }

  async validateBatch(
    batch: BatchEventDto,
    tenantId: number,
    userId: number,
  ): Promise<void> {
    // Batch size check
    if (batch.events.length === 0) {
      throw new BadRequestException('Batch cannot be empty');
    }

    if (batch.events.length > this.maxBatchSize) {
      throw new BadRequestException(
        `Batch size exceeds maximum of ${this.maxBatchSize} events`,
      );
    }

    // Device ID consistency check
    const inconsistentDeviceIds = batch.events.some(
      (e) => e.deviceId !== batch.deviceId,
    );
    if (inconsistentDeviceIds) {
      throw new BadRequestException(
        'All events must have the same deviceId as batch',
      );
    }

    const now = Date.now();

    // Validate each event
    for (let i = 0; i < batch.events.length; i++) {
      const event = batch.events[i];
      this.validateEvent(event, now, i);
    }

    // Batch timestamp sanity check
    const batchAge = now - batch.batchTimestamp;
    if (batchAge > this.maxTimestampAge) {
      throw new BadRequestException('Batch timestamp is too old');
    }
    if (batch.batchTimestamp > now + this.maxTimestampFuture) {
      throw new BadRequestException('Batch timestamp is too far in the future');
    }
  }

  private validateEvent(event: EventDto, now: number, index: number): void {
    // Timestamp validation
    const eventAge = now - event.timestamp;
    if (eventAge > this.maxTimestampAge) {
      throw new BadRequestException(
        `Event at index ${index} has timestamp too old`,
      );
    }
    if (event.timestamp > now + this.maxTimestampFuture) {
      throw new BadRequestException(
        `Event at index ${index} has timestamp too far in the future`,
      );
    }

    // Status validation (already done by DTO enum, but double-check)
    if (!Object.values(EventStatus).includes(event.status as EventStatus)) {
      throw new BadRequestException(
        `Event at index ${index} has invalid status`,
      );
    }

    // Duration validation if present
    if (event.duration !== undefined && event.duration < 0) {
      throw new BadRequestException(
        `Event at index ${index} has negative duration`,
      );
    }
  }

  async publishToQueue(
    batch: BatchEventDto,
    tenantId: number,
    userId: number,
    deviceId: string,
  ): Promise<void> {
    const topic = this.configService.get<string>('kafka.topicRawEvents');

    const message = {
      ...batch,
      tenantId,
      userId,
      ingestedAt: Date.now(),
    };

    try {
      await this.kafkaClient.emit(topic, message);
      this.logger.log(
        `Published batch of ${batch.events.length} events to ${topic} for device ${deviceId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to publish batch to Kafka: ${error.message}`,
        error.stack,
      );
      // In production, you might want to implement a retry mechanism or dead-letter queue
      // For now, we'll throw to let the controller handle it
      throw new Error('Failed to publish events to queue');
    }
  }

  async onModuleDestroy() {
    // Gracefully disconnect from Kafka
    await this.kafkaClient.close();
    this.logger.log('Disconnected from Kafka');
  }
}
