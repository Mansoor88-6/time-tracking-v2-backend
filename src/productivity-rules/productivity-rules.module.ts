import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductivityRulesService } from './productivity-rules.service';
import { ProductivityRulesController } from './productivity-rules.controller';
import { TeamProductivityRule } from './entities/team-productivity-rule.entity';
import { UnclassifiedApp } from './entities/unclassified-app.entity';
import { RuleCollectionTeam } from '../rule-collections/entities/rule-collection-team.entity';
import { TeamsModule } from '../teams/teams.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TeamProductivityRule,
      UnclassifiedApp,
      RuleCollectionTeam,
    ]),
    TeamsModule,
    TenantsModule,
  ],
  controllers: [ProductivityRulesController],
  providers: [ProductivityRulesService],
  exports: [ProductivityRulesService],
})
export class ProductivityRulesModule {}
