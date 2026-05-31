import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString, IsEnum } from 'class-validator';
import { DayStatus } from '@prisma/client';

export class DailyEntryFiltersDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() contractId?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(DayStatus) status?: DayStatus;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}

export class UpdateDailyEntryCommentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() comment?: string;
}
