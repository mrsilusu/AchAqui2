import { IsString } from 'class-validator';

export class ReplyReviewDto {
  @IsString()
  response: string;
}
