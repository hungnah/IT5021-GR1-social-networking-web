import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

// DTO cho endpoint POST /auth/refresh
// Client gửi kèm userId + refreshToken (raw) để backend xác thực.
export class RefreshTokenDto {
  @ApiProperty({
    description: 'UUID của user (lấy từ thông tin user đã lưu ở FE)',
    example: 'b3b8f6e2-9c1a-4f7e-9c1a-9c1a4f7e9c1a',
  })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    description: 'Refresh token nhận được lúc login (UUID, chưa hash)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
