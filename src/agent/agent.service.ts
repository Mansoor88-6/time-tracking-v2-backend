import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const AGENT_FILENAME = 'tracking-agent.exe';
const MAC_AGENT_BASE = 'tracking-agent-macos';
const MAC_EXTENSIONS = ['.dmg', '.zip'] as const;

export interface AgentInfo {
  filename: string;
  size: number;
  uploadedAt: string;
}

@Injectable()
export class AgentService {
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;
  private readonly agentPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = this.configService.get<string>('agent.uploadDir') ?? 'uploads/agent';
    this.maxFileSizeBytes = this.configService.get<number>('agent.maxFileSizeBytes') ?? 104857600;
    this.agentPath = path.join(this.uploadDir, AGENT_FILENAME);
  }

  /**
   * Single Mac artifact: either tracking-agent-macos.dmg or .zip (latest upload wins per ext).
   */
  resolveMacArtifact(): { path: string; filename: string } | null {
    for (const ext of MAC_EXTENSIONS) {
      const p = path.join(this.uploadDir, `${MAC_AGENT_BASE}${ext}`);
      try {
        fs.accessSync(p, fs.constants.R_OK);
        return { path: p, filename: `${MAC_AGENT_BASE}${ext}` };
      } catch {
        /* try next */
      }
    }
    return null;
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

  async saveMacFile(file: Express.Multer.File): Promise<AgentInfo> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${this.maxFileSizeBytes / 1024 / 1024} MB)`,
      );
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.zip' && ext !== '.dmg') {
      throw new BadRequestException(
        'Only .zip or .dmg files are allowed for the Mac agent',
      );
    }

    fs.mkdirSync(this.uploadDir, { recursive: true });
    for (const other of MAC_EXTENSIONS) {
      if (other !== ext) {
        const p = path.join(this.uploadDir, `${MAC_AGENT_BASE}${other}`);
        try {
          fs.unlinkSync(p);
        } catch {
          /* no file */
        }
      }
    }
    const macPath = path.join(this.uploadDir, `${MAC_AGENT_BASE}${ext}`);
    fs.writeFileSync(macPath, file.buffer);
    const stat = fs.statSync(macPath);
    const filename = `${MAC_AGENT_BASE}${ext}`;
    return {
      filename,
      size: stat.size,
      uploadedAt: stat.mtime.toISOString(),
    };
  }

  async getMacInfo(): Promise<AgentInfo | null> {
    const art = this.resolveMacArtifact();
    if (!art) return null;
    const stat = fs.statSync(art.path);
    return {
      filename: art.filename,
      size: stat.size,
      uploadedAt: stat.mtime.toISOString(),
    };
  }
}
