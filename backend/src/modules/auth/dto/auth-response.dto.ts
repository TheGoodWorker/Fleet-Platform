import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty({ nullable: true }) email: string | null;
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty({ enum: UserRole }) role: UserRole;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty() expiresIn: string;
  @ApiProperty({ type: AuthUserDto }) user: AuthUserDto;
}
