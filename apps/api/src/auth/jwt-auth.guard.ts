import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  jwtVerify,
  type JWTPayload,
} from 'jose';
import * as jwt from 'jsonwebtoken';

export type JwtUser = { sub: string; email?: string };

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = auth.slice('Bearer '.length);

    try {
      const header = decodeProtectedHeader(token);
      const alg = header.alg;

      // Some Supabase projects issue asymmetric JWTs (e.g. ES256/RS256) which must be
      // verified against the project's JWKS. Older projects may still be HS256.
      let payload: JWTPayload;

      if (alg === 'HS256') {
        const secret = process.env.SUPABASE_JWT_SECRET;
        if (!secret) throw new UnauthorizedException('Server misconfigured');
        const p = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
        payload = p as unknown as JWTPayload;
      } else {
        const url = process.env.SUPABASE_URL;
        if (!url) {
          throw new UnauthorizedException(
            'Server misconfigured (SUPABASE_URL required for JWKS verification)',
          );
        }
        if (!jwks) {
          const jwksUrl = new URL('/auth/v1/.well-known/jwks.json', url);
          jwks = createRemoteJWKSet(jwksUrl);
        }
        const verified = await jwtVerify(token, jwks, {
          // issuer will look like: https://<project>.supabase.co/auth/v1
          issuer: `${url.replace(/\/$/, '')}/auth/v1`,
        });
        payload = verified.payload;
      }

      if (!payload.sub) throw new UnauthorizedException('Invalid token');
      req.user = { sub: String(payload.sub), email: payload.email as string | undefined };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
