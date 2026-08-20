import type { Request as ExpressRequest } from 'express';

/** The user object attached to the request by JwtStrategy.validate */
export interface AuthUser {
  userId: string;
  email: string;
}

/** Express request carrying an authenticated user (set by JwtAuthGuard) */
export interface AuthenticatedRequest extends ExpressRequest {
  user: AuthUser;
}
