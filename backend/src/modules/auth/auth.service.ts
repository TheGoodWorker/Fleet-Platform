import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email ou numéro de téléphone requis');
    }

    const user = await this.findUserByCredential(dto);
    await this.verifyPassword(dto.password, user.passwordHash);
    await this.updateLastLogin(user.id);

    return this.buildAuthResponse(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token de type invalide');
    }

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
    });

    if (!user || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Compte inactif');
    }

    return this.buildAuthResponse(user);
  }

  async getProfile(userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
        driver: { select: { id: true, status: true, scoreValue: true } },
        owner: { select: { id: true, type: true, status: true } },
      },
    });
  }

  private async findUserByCredential(dto: LoginDto): Promise<User> {
    const where = dto.email
      ? { email: dto.email }
      : { phone: dto.phone as string };

    const user = await this.prisma.user.findFirst({ where });

    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Compte suspendu. Contactez votre administrateur.');
    }

    return user;
  }

  private async verifyPassword(plain: string, hash: string): Promise<void> {
    const valid = await bcrypt.compare(plain, hash);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides');
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  private buildAuthResponse(user: User): AuthResponseDto {
    const accessPayload: JwtPayload = {
      sub: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      role: user.role,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      role: user.role,
      type: 'refresh',
    };

    const accessExpiresIn = this.configService.get<string>('jwt.accessExpiresIn', '1d');
    const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn', '7d');

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.configService.get<string>('jwt.accessSecret'),
      expiresIn: accessExpiresIn,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.configService.get<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    };
  }
}
