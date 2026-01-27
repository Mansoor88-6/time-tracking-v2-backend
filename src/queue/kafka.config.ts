import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { KafkaOptions } from '@nestjs/microservices/interfaces/microservice-configuration.interface';

export const getKafkaConfig = (
  configService: ConfigService,
): KafkaOptions => {
  const broker = configService.get<string>('kafka.broker') || 'localhost:9092';
  const clientId = configService.get<string>('kafka.clientId') || 'time-tracking-api';
  const groupId = configService.get<string>('kafka.groupId') || 'events-producer';

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
        groupId,
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
