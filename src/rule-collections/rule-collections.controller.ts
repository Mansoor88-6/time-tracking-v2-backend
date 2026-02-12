import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { RuleCollectionsService } from './rule-collections.service';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { AddRulesToCollectionDto } from './dto/add-rules-to-collection.dto';
import { AssignCollectionToTeamsDto } from './dto/assign-collection-to-teams.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';

@Controller('rule-collections')
@UseGuards(JwtAuthGuard, TenantGuard)
export class RuleCollectionsController {
  constructor(
    private readonly ruleCollectionsService: RuleCollectionsService,
  ) {}

  @Get('suggestions')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  getSuggestions() {
    return this.ruleCollectionsService.getSuggestedApps();
  }

  @Post()
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateCollectionDto, @Request() req) {
    return this.ruleCollectionsService.createCollection(
      req.user.tenantId,
      req.user.id,
      dto,
    );
  }

  @Get()
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  findAll(
    @Query('teamId') teamId?: string,
    @Request() req?,
  ) {
    const filters: any = {};
    if (teamId) {
      filters.teamId = parseInt(teamId, 10);
    }
    return this.ruleCollectionsService.getCollections(
      req.user.tenantId,
      filters,
    );
  }

  @Get(':id')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ruleCollectionsService.findOne(req.user.tenantId, id);
  }

  @Patch(':id')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCollectionDto,
    @Request() req,
  ) {
    return this.ruleCollectionsService.updateCollection(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.ruleCollectionsService.deleteCollection(
      req.user.tenantId,
      id,
    );
  }

  @Post(':id/rules')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  addRules(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddRulesToCollectionDto,
    @Request() req,
  ) {
    return this.ruleCollectionsService.addRulesToCollection(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete('rules/:ruleId')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  removeRule(@Param('ruleId', ParseIntPipe) ruleId: number, @Request() req) {
    return this.ruleCollectionsService.removeRuleFromCollection(
      req.user.tenantId,
      ruleId,
    );
  }

  @Post(':id/teams')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  assignToTeams(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCollectionToTeamsDto,
    @Request() req,
  ) {
    return this.ruleCollectionsService.assignToTeams(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete(':id/teams/:teamId')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  unassignFromTeam(
    @Param('id', ParseIntPipe) id: number,
    @Param('teamId', ParseIntPipe) teamId: number,
    @Request() req,
  ) {
    return this.ruleCollectionsService.unassignFromTeam(
      req.user.tenantId,
      id,
      teamId,
    );
  }
}
