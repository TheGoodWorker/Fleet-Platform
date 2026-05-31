import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'fleet_access_secret_dev_only',
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1d',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'fleet_refresh_secret_dev_only',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
}));
