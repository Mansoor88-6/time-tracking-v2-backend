import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfflineTimeRequest } from './entities/offline-time-request.entity';
import { OfflineTimeRequestStatus } from './enums/offline-time-request-status.enum';
import { CreateOfflineTimeRequestDto } from './dto/create-offline-time-request.dto';
import { OfflineTimeCategory } from './enums/offline-time-category.enum';

@Injectable()
export class OfflineTimeRequestsService {
  private readonly logger = new Logger(OfflineTimeRequestsService.name);
  private readonly workerServiceUrl: string;
  private readonly workerInternalKey: string;
  private readonly requestTimeoutMs: number;

  constructor(
    @InjectRepository(OfflineTimeRequest)
    private readonly repo: Repository<OfflineTimeRequest>,
    private readonly configService: ConfigService,
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
          '15000',
        10,
      ) || 15000;
  }

  async create(
    tenantId: number,
    userId: number,
    dto: CreateOfflineTimeRequestDto,
  ): Promise<OfflineTimeRequest> {
    const start = new Date(dto.startAt);
    const end = new Date(dto.endAt);
    if (end <= start) {
      throw new BadRequestException('endAt must be after startAt');
    }
    const maxMs = 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > maxMs) {
      throw new BadRequestException('Range cannot exceed 24 hours');
    }

    const newStartMs = start.getTime();
    const newEndMs = end.getTime();
    const existingPending = await this.repo.find({
      where: {
        tenantId,
        userId,
        status: OfflineTimeRequestStatus.PENDING,
      },
    });
    for (const p of existingPending) {
      const ps = p.startAt.getTime();
      const pe = p.endAt.getTime();
      if (newStartMs < pe && newEndMs > ps) {
        throw new BadRequestException(
          'You already have a pending offline time request that overlaps this time range.',
        );
      }
    }

    const row = this.repo.create({
      tenantId,
      userId,
      startAt: start,
      endAt: end,
      description: dto.description.trim(),
      category: dto.category,
      status: OfflineTimeRequestStatus.PENDING,
      reviewedByUserId: null,
      reviewedAt: null,
      declineReason: null,
    });
    return this.repo.save(row);
  }

  async listMine(
    tenantId: number,
    userId: number,
    status?: OfflineTimeRequestStatus,
  ): Promise<OfflineTimeRequest[]> {
    const q = this.repo
      .createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.userId = :userId', { userId })
      .orderBy('r.createdAt', 'DESC');
    if (status) {
      q.andWhere('r.status = :status', { status });
    }
    return q.getMany();
  }

  async listPendingForTenant(tenantId: number): Promise<OfflineTimeRequest[]> {
    return this.repo.find({
      where: { tenantId, status: OfflineTimeRequestStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async findOneForTenant(
    id: number,
    tenantId: number,
  ): Promise<OfflineTimeRequest> {
    const r = await this.repo.findOne({ where: { id, tenantId } });
    if (!r) {
      throw new NotFoundException('Request not found');
    }
    return r;
  }

  async approve(
    id: number,
    tenantId: number,
    reviewerUserId: number,
  ): Promise<OfflineTimeRequest> {
    const r = await this.findOneForTenant(id, tenantId);
    if (r.status !== OfflineTimeRequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }

    await this.callWorkerInsertSyntheticEvent(r);

    r.status = OfflineTimeRequestStatus.APPROVED;
    r.reviewedByUserId = reviewerUserId;
    r.reviewedAt = new Date();
    r.declineReason = null;
    return this.repo.save(r);
  }

  async decline(
    id: number,
    tenantId: number,
    reviewerUserId: number,
    reason?: string,
  ): Promise<OfflineTimeRequest> {
    const r = await this.findOneForTenant(id, tenantId);
    if (r.status !== OfflineTimeRequestStatus.PENDING) {
      throw new BadRequestException('Request is not pending');
    }
    r.status = OfflineTimeRequestStatus.DECLINED;
    r.reviewedByUserId = reviewerUserId;
    r.reviewedAt = new Date();
    r.declineReason = reason?.trim() || null;
    return this.repo.save(r);
  }

  private async callWorkerInsertSyntheticEvent(r: OfflineTimeRequest): Promise<void> {
    const startMs = r.startAt.getTime();
    const endMs = r.endAt.getTime();
    const url = `${this.workerServiceUrl}/internal/stats/manual-offline-event`;

    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.requestTimeoutMs,
    );

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Worker-Key': this.workerInternalKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: r.tenantId,
          userId: r.userId,
          requestId: r.id,
          startMs,
          endMs,
          category: r.category as unknown as 'productive' | 'neutral' | 'unproductive',
          description: r.description,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Worker manual-offline-event failed: ${text}`);
        if (response.status >= 500) {
          throw new ServiceUnavailableException(
            'Worker could not apply offline time',
          );
        }
        throw new HttpException(
          text || 'Worker rejected',
          response.status || HttpStatus.BAD_GATEWAY,
        );
      }
    } catch (e: unknown) {
      clearTimeout(timeoutId);
      if (e instanceof Error && e.name === 'AbortError') {
        throw new ServiceUnavailableException('Worker request timed out');
      }
      if (
        e instanceof HttpException ||
        e instanceof ServiceUnavailableException
      ) {
        throw e;
      }
      throw new ServiceUnavailableException(
        e instanceof Error ? e.message : 'Worker failed',
      );
    }
  }
}
