import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsEmail, IsUUID } from 'class-validator';
import { OwnerType } from '@prisma/client';

export class CreateOwnerDto {
  @ApiProperty({ enum: OwnerType }) @IsEnum(OwnerType) type: OwnerType;
  @ApiProperty({ example: 'Ibrahima Sow' }) @IsString() name: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional({ description: 'ID du compte utilisateur si le propriétaire a un accès portail' })
  @IsOptional() @IsUUID() userId?: string;
}

export class UpdateOwnerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
