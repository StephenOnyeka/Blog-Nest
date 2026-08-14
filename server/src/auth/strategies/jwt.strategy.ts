import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_SECRET_KEY') || 'secret',
    });
  }

  async validate(payload: any) {
    // payload is the decoded JWT. For Supabase, payload.sub is the user ID.
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
