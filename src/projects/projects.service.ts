import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
  ) {}

  async create(tenantId: number, dto: CreateProjectDto): Promise<Project> {
    const project = this.projectsRepository.create({
      name: dto.name,
      description: dto.description,
      tenantId,
      teamId: dto.teamId,
    });
    return this.projectsRepository.save(project);
  }

  async findAll(tenantId: number): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { tenantId },
    });
  }

  async findOne(tenantId: number, id: number): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id, tenantId },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async update(
    tenantId: number,
    id: number,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    const project = await this.findOne(tenantId, id);
    Object.assign(project, dto);
    return this.projectsRepository.save(project);
  }

  async remove(tenantId: number, id: number): Promise<void> {
    const project = await this.findOne(tenantId, id);
    await this.projectsRepository.delete(project.id);
  }
}

