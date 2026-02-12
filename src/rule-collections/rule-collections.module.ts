import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RuleCollectionsService } from './rule-collections.service';
import { RuleCollectionsController } from './rule-collections.controller';
import { RuleCollection } from './entities/rule-collection.entity';
import { RuleCollectionTeam } from './entities/rule-collection-team.entity';
import { TeamProductivityRule } from '../productivity-rules/entities/team-productivity-rule.entity';
import { TeamsModule } from '../teams/teams.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RuleCollection,
      RuleCollectionTeam,
      TeamProductivityRule,
    ]),
    forwardRef(() => TeamsModule),
    TenantsModule,
  ],
  controllers: [RuleCollectionsController],
  providers: [RuleCollectionsService],
  exports: [RuleCollectionsService],
})
export class RuleCollectionsModule {}
