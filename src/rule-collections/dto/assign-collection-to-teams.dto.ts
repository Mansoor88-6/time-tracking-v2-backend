import { IsArray, IsInt } from 'class-validator';

export class AssignCollectionToTeamsDto {
  @IsArray()
  @IsInt({ each: true })
  teamIds: number[];
}
