import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';

@Controller('projects')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateProjectDto, @Request() req) {
    return this.projectsService.create(req.user.tenantId, dto);
  }

  @Get()
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER, Roles.VIEWER, Roles.EMPLOYEE)
  @UseGuards(RolesGuard)
  findAll(@Request() req) {
    return this.projectsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER, Roles.VIEWER, Roles.EMPLOYEE)
  @UseGuards(RolesGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.projectsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER)
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjectDto,
    @Request() req,
  ) {
    return this.projectsService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.projectsService.remove(req.user.tenantId, id);
  }
}

