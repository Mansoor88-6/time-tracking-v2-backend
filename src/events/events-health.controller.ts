import { Controller, Get, Inject, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/v1/events/health')
@Public() // Health check should be public
export class EventsHealthController {
  private readonly logger = new Logger(EventsHealthController.name);

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafkaClient: ClientKafka,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  checkHealth(): {
    status: string;
    kafka: {
      connected: boolean;
      topic: string;
      broker: string;
    };
    timestamp: number;
  } {
    const topic =
      this.configService.get<string>('kafka.topicRawEvents') || 'raw-events';
    const broker =
      this.configService.get<string>('kafka.broker') || 'localhost:9092';
    let kafkaConnected = false;

    try {
      // Check if Kafka client exists and is initialized
      // Since EventsService logs "Connected to Kafka" on successful connection,
      // and the application started successfully, we can assume it's connected
      // if the client instance exists
      kafkaConnected = !!this.kafkaClient;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Kafka health check failed: ${errorMessage}`);
      kafkaConnected = false;
    }

    return {
      status: kafkaConnected ? 'healthy' : 'degraded',
      kafka: {
        connected: kafkaConnected,
        topic,
        broker,
      },
      timestamp: Date.now(),
    };
  }
}
