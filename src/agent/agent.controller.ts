import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { join } from 'path';
import { AgentService, AgentInfo, ExtensionInfo } from './agent.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';

const MAX_FILE_SIZE = 104857600; // 100 MB

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File): Promise<AgentInfo> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.agentService.saveFile(file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('info')
  async getInfo(): Promise<AgentInfo | null> {
    return this.agentService.getInfo();
  }

  @UseGuards(JwtAuthGuard)
  @Get('download')
  async download(@Res() res: Response): Promise<void> {
    const filePath = this.agentService.getFilePath();
    if (!filePath) {
      throw new NotFoundException('Tracking agent is not available');
    }
    const absolutePath = join(process.cwd(), filePath);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="tracking-agent.exe"',
    );
    res.sendFile(absolutePath);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Post('extension/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_FILE_SIZE },
    }),
  )
  async uploadExtension(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ExtensionInfo> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.agentService.saveExtension(file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('extension/info')
  async getExtensionInfo(): Promise<ExtensionInfo | null> {
    return this.agentService.getExtensionInfo();
  }

  @UseGuards(JwtAuthGuard)
  @Get('extension/download')
  async downloadExtension(@Res() res: Response): Promise<void> {
    const filePath = this.agentService.getExtensionFilePath();
    if (!filePath) {
      throw new NotFoundException('Browser extension is not available');
    }
    const absolutePath = join(process.cwd(), filePath);
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="browser-extension.zip"',
    );
    res.sendFile(absolutePath);
  }
}
