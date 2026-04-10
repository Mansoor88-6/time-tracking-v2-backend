import { IsInt, Min } from 'class-validator';

export class CopyRulesFromCollectionDto {
  @IsInt()
  @Min(1)
  sourceCollectionId: number;
}
