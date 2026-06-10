import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PrivacyLevel } from '../post.entity';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacyStatus?: PrivacyLevel;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  taggedUserIds?: string[];
}
