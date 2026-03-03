import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const AGENT_FILENAME = 'tracking-agent.exe';
const EXTENSION_FILENAME = 'browser-extension.zip';

export interface AgentInfo {
  filename: string;
  size: number;
  uploadedAt: string;
}

export interface ExtensionInfo {
  filename: string;
  size: number;
  uploadedAt: string;
}

@Injectable()
export class AgentService {
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;
  private readonly agentPath: string;
  private readonly extensionPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('agent.uploadDir') ?? 'uploads/agent';
    this.maxFileSizeBytes = this.configService.get<number>('agent.maxFileSizeBytes') ?? 104857600;
    this.agentPath = path.join(this.uploadDir, AGENT_FILENAME);
    this.extensionPath = path.join(this.uploadDir, EXTENSION_FILENAME);
  }

  async saveFile(file: Express.Multer.File): Promise<AgentInfo> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${this.maxFileSizeBytes / 1024 / 1024} MB)`,
      );
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.exe') {
      throw new BadRequestException('Only .exe files are allowed');
    }

    fs.mkdirSync(this.uploadDir, { recursive: true });
    fs.writeFileSync(this.agentPath, file.buffer);

    const stat = fs.statSync(this.agentPath);
    return {
      filename: AGENT_FILENAME,
      size: stat.size,
      uploadedAt: stat.mtime.toISOString(),
    };
  }

  async getInfo(): Promise<AgentInfo | null> {
    try {
      const stat = fs.statSync(this.agentPath);
      return {
        filename: AGENT_FILENAME,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  getFilePath(): string | null {
    try {
      fs.accessSync(this.agentPath, fs.constants.R_OK);
      return this.agentPath;
    } catch {
      return null;
    }
  }

  async saveExtension(file: Express.Multer.File): Promise<ExtensionInfo> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${this.maxFileSizeBytes / 1024 / 1024} MB)`,
      );
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip') {
      throw new BadRequestException('Only .zip files are allowed');
    }

    fs.mkdirSync(this.uploadDir, { recursive: true });
    fs.writeFileSync(this.extensionPath, file.buffer);

    const stat = fs.statSync(this.extensionPath);
    return {
      filename: EXTENSION_FILENAME,
      size: stat.size,
      uploadedAt: stat.mtime.toISOString(),
    };
  }

  async getExtensionInfo(): Promise<ExtensionInfo | null> {
    try {
      const stat = fs.statSync(this.extensionPath);
      return {
        filename: EXTENSION_FILENAME,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
      };
    } catch {
      return null;
    }
  }

  getExtensionFilePath(): string | null {
    try {
      fs.accessSync(this.extensionPath, fs.constants.R_OK);
      return this.extensionPath;
    } catch {
      return null;
    }
  }
}
