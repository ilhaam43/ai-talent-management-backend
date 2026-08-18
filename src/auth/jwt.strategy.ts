import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../database/prisma.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') || 'supersecretjwt'
    })
  }

  async validate(payload: any) {
    let candidateId = payload.candidateId;

    // If candidateId is not in the JWT payload, do a live DB lookup
    if (!candidateId && payload.sub) {
      const candidate = await this.prisma.candidate.findFirst({
        where: { userId: payload.sub },
        select: { id: true },
      });
      candidateId = candidate?.id || null;
    }

    return {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      name: payload.name,
      candidateId,
      role: payload.role
    }
  }
}