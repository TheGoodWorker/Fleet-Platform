import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsDateString } from 'class-validator';

export class GrantPermissionDto {
  @ApiProperty({ example: 'can_validate_charge' })
  @IsString()
  permissionCode: string;

  @ApiProperty({ example: true, description: 'true = accorder, false = révoquer' })
  @IsBoolean()
  isGranted: boolean;

  @ApiPropertyOptional({ example: 'Délégation temporaire pendant absence SM' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ example: '2026-06-30T23:59:59Z', description: 'Null = permanent' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
