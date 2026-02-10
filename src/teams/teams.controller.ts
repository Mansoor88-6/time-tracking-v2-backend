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
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { AddTeamMemberDto } from './dto/add-team-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';

@Controller('teams')
@UseGuards(JwtAuthGuard, TenantGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateTeamDto, @Request() req) {
    return this.teamsService.create(
      req.user.tenantId,
      dto,
      req.user.id,
      req.user.role,
    );
  }

  @Get()
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER, Roles.VIEWER)
  @UseGuards(RolesGuard)
  findAll(@Request() req) {
    return this.teamsService.findAll(req.user.tenantId);
  }

  @Get(':id')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER, Roles.VIEWER)
  @UseGuards(RolesGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.teamsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER)
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTeamDto,
    @Request() req,
  ) {
    return this.teamsService.update(req.user.tenantId, id, dto);
  }

  @Delete(':id')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.teamsService.remove(req.user.tenantId, id);
  }

  @Get(':id/members')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER)
  @UseGuards(RolesGuard)
  getTeamMembers(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.teamsService.getTeamMembers(req.user.tenantId, id);
  }

  @Post(':id/members')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER)
  @UseGuards(RolesGuard)
  addTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddTeamMemberDto,
    @Request() req,
  ) {
    return this.teamsService.addTeamMember(
      req.user.tenantId,
      id,
      dto.userId,
    );
  }

  @Delete(':id/members/:userId')
  @RolesDecorator(Roles.ORG_ADMIN, Roles.TEAM_MANAGER)
  @UseGuards(RolesGuard)
  removeTeamMember(
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) userId: number,
    @Request() req,
  ) {
    return this.teamsService.removeTeamMember(
      req.user.tenantId,
      id,
      userId,
    );
  }
}

