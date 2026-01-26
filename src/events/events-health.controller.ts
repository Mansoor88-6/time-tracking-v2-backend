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
  async checkHealth(): Promise<{
    status: string;
    kafka: {
      connected: boolean;
      topic: string;
    };
    timestamp: number;
  }> {
    const topic = this.configService.get<string>('kafka.topicRawEvents');
    let kafkaConnected = false;

    try {
      // Check if Kafka client is connected
      // Note: ClientKafka doesn't expose a direct connection status
      // We'll check if the client exists and is initialized
      kafkaConnected =
        !!this.kafkaClient && this.kafkaClient.connected !== false;
    } catch (error) {
      this.logger.warn(`Kafka health check failed: ${error.message}`);
      kafkaConnected = false;
    }

    return {
      status: kafkaConnected ? 'healthy' : 'degraded',
      kafka: {
        connected: kafkaConnected,
        topic,
      },
      timestamp: Date.now(),
    };
  }
}
