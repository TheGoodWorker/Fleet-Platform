import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Matches } from 'class-validator';
import { PermissionModule } from '@prisma/client';

export class CreatePermissionDto {
  @ApiProperty({ example: 'can_validate_charge', description: 'Code unique snake_case' })
  @IsString()
  @Matches(/^can_[a-z_]+$/, { message: 'Le code doit être au format can_action_subject' })
  code: string;

  @ApiProperty({ example: 'Valider une charge' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: PermissionModule })
  @IsEnum(PermissionModule)
  module: PermissionModule;
}
