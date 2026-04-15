import { IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @IsString()
  comment: string;

  @IsArray() @IsOptional()
  photos?: string[];
}
