import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

export const getKafkaConfig = (
  configService: ConfigService,
): MicroserviceOptions => {
  const broker = configService.get<string>('kafka.broker');
  const clientId = configService.get<string>('kafka.clientId');

  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId,
        brokers: [broker],
        retry: {
          retries: 5,
          initialRetryTime: 100,
          multiplier: 2,
        },
      },
      consumer: {
        groupId: configService.get<string>('kafka.groupId'),
        allowAutoTopicCreation: true,
      },
      producer: {
        allowAutoTopicCreation: true,
        idempotent: true,
        maxInFlightRequests: 1,
        retry: {
          retries: 5,
          initialRetryTime: 100,
          multiplier: 2,
        },
      },
    },
  };
};
