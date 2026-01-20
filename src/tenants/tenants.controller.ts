import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { CheckStatusDto } from './dto/check-status.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolesDecorator } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../common/enums/roles.enum';
import { AuthService } from '../auth/auth.service';

@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Public()
  @Post('check-status')
  async checkStatus(@Body() checkStatusDto: CheckStatusDto) {
    return await this.tenantsService.checkStatusByEmail(checkStatusDto.email);
  }

  @Public()
  @Post('setup-password')
  async setupPassword(@Body() setupPasswordDto: SetupPasswordDto) {
    const user = await this.tenantsService.setupPassword(setupPasswordDto);
    // Generate and return JWT token (user is automatically logged in)
    return await this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Get()
  findAll() {
    return this.tenantsService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTenantDto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Post(':id/approve')
  approve(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.approve(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Post(':id/suspend')
  suspend(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.suspend(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @RolesDecorator(Roles.SUPER_ADMIN)
  @Post(':id/activate')
  activate(@Param('id', ParseIntPipe) id: number) {
    return this.tenantsService.activate(id);
  }
}
