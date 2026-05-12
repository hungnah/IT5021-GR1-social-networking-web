import { IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsUrl({}, { message: 'avatarUrl phải là URL hợp lệ' })
  @MaxLength(500)
  avatarUrl?: string;

  @IsOptional()
  @IsUrl({}, { message: 'coverUrl phải là URL hợp lệ' })
  @MaxLength(500)
  coverUrl?: string;

  @IsOptional()
  @IsString()
  @IsIn(['Nam', 'Nữ', 'Tùy chọn', 'Không muốn tiết lộ'])
  gender?: string;
}
