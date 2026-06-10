import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID người nhận' })
  @IsUUID()
  receiverId!: string;

  @ApiProperty({ description: 'Nội dung tin nhắn', maxLength: 2000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
