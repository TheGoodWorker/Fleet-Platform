import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength } from 'class-validator';

export class LoginDto {
  @ApiPropertyOptional({ example: 'admin@fleet.local', description: 'Email (Admin/Manager/Owner)' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: '+221701234567', description: 'Téléphone (Driver)' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'MonMotDePasse123!' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
