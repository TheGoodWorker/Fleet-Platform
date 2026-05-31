import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsInt, IsUUID, Min, Max } from 'class-validator';
import { VehicleStatus } from '@prisma/client';

export class CreateVehicleDto {
  @ApiProperty({ example: 'DK 1234 AB' }) @IsString() plateNumber: string;
  @ApiProperty({ example: 'Toyota' }) @IsString() brand: string;
  @ApiProperty({ example: 'HiAce' }) @IsString() model: string;

  @ApiPropertyOptional({ example: 'AA123456789012345' }) @IsOptional() @IsString() vin?: string;
  @ApiPropertyOptional({ example: 2022 }) @IsOptional() @IsInt() @Min(2000) @Max(2030) year?: number;
  @ApiPropertyOptional({ example: 'Blanc' }) @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional({ example: 'DIESEL', enum: ['GASOLINE', 'DIESEL', 'HYBRID', 'ELECTRIC'] })
  @IsOptional() @IsString() fuelType?: string;
  @ApiPropertyOptional({ example: 'MANUAL', enum: ['MANUAL', 'AUTOMATIC'] })
  @IsOptional() @IsString() transmission?: string;
  @ApiPropertyOptional({ example: 9 }) @IsOptional() @IsInt() seats?: number;

  @ApiPropertyOptional({ description: 'ID du propriétaire' }) @IsOptional() @IsUUID() ownerId?: string;
  @ApiPropertyOptional({ description: 'ID Carcul GPS' }) @IsOptional() @IsString() carculVehicleId?: string;
}

export class UpdateVehicleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fuelType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() transmission?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() seats?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() carculVehicleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() ownerId?: string;
}

export class AssignManagerDto {
  @ApiProperty() @IsUUID() managerId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reason?: string;
}

export class VehicleFiltersDto {
  @ApiPropertyOptional({ enum: VehicleStatus }) @IsOptional() @IsEnum(VehicleStatus) status?: VehicleStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() ownerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() managerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
}
