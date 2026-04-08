import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RedeemLoyaltyDto {
  @IsInt()
  @Min(1)
  @Max(5000)
  points!: number;

  @IsOptional()
  @IsString()
  rewardCode?: string;
}
