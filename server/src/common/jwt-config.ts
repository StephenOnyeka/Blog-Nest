import type { ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';

/** Shared JWT configuration resolved from environment variables */
export interface JwtConfig {
  secret: string;
  expiresIn: StringValue;
}

/** Build the JwtModule options from the app environment config */
export function getJwtConfig(configService: ConfigService): JwtModuleOptions {
  return {
    secret: configService.get<string>('JWT_SECRET') ?? 'fallback-secret',
    signOptions: {
      expiresIn: configService.get<StringValue>('JWT_EXPIRY') ?? '7d',
    },
  };
}
