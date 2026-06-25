import { IsIn, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9._]{1,30}$/, {
    message:
      'Username chỉ được dùng chữ, số, dấu chấm (.) và gạch dưới (_), tối đa 30 ký tự',
  })
  username?: string;

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

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;
}
