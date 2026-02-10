import { IsInt, IsNotEmpty } from 'class-validator';

export class AddTeamMemberDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;
}
