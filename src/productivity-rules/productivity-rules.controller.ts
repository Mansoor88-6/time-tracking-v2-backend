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
import { ProductivityRulesService } from './productivity-rules.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { UpdateRuleDto } from './dto/update-rule.dto';
import { BulkCreateRulesDto } from './dto/bulk-create-rules.dto';
import { ClassifyUnclassifiedDto } from './dto/classify-unclassified.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Roles } from '../common/enums/roles.enum';
import { AppType } from './entities/team-productivity-rule.entity';
import { UnclassifiedAppStatus } from './entities/unclassified-app.entity';

@Controller('productivity-rules')
@UseGuards(JwtAuthGuard, TenantGuard)
export class ProductivityRulesController {
  constructor(
    private readonly productivityRulesService: ProductivityRulesService,
  ) {}

  @Post()
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  create(@Body() dto: CreateRuleDto, @Request() req) {
    return this.productivityRulesService.createRule(
      req.user.tenantId,
      dto,
    );
  }

  @Post('bulk')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  bulkCreate(@Body() dto: BulkCreateRulesDto, @Request() req) {
    return this.productivityRulesService.bulkCreateRules(
      req.user.tenantId,
      dto,
    );
  }

  @Get('teams/:teamId')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  getTeamRules(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Request() req,
  ) {
    return this.productivityRulesService.getTeamRules(
      req.user.tenantId,
      teamId,
    );
  }

  @Patch(':id')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRuleDto,
    @Request() req,
  ) {
    return this.productivityRulesService.updateRule(
      req.user.tenantId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.productivityRulesService.deleteRule(req.user.tenantId, id);
  }

  @Get('unclassified')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  getUnclassified(
    @Query('teamId') teamId?: string,
    @Query('appType') appType?: AppType,
    @Query('status') status?: UnclassifiedAppStatus,
    @Request() req?,
  ) {
    const filters: any = {};
    if (teamId) {
      filters.teamId = parseInt(teamId, 10);
    }
    if (appType) {
      filters.appType = appType;
    }
    if (status) {
      filters.status = status;
    }

    return this.productivityRulesService.getUnclassifiedApps(
      req.user.tenantId,
      filters,
    );
  }

  @Post('unclassified/classify')
  @RolesDecorator(Roles.ORG_ADMIN)
  @UseGuards(RolesGuard)
  classifyUnclassified(@Body() dto: ClassifyUnclassifiedDto, @Request() req) {
    return this.productivityRulesService.classifyUnclassified(
      req.user.tenantId,
      dto,
    );
  }
}
