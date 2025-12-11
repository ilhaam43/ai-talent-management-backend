import { Injectable, UnauthorizedException } from '@nestjs/common'
import { CandidatesService } from '../candidates/candidates.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.candidatesService.findOne(email)
    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user
      return result
    }
    return null
  }

  async login(user: any) {
    const payload = { email: user.email || user.candidateEmail, sub: user.id, type: 'access' }
    
    // Generate access token (15 minutes)
    const accessToken = this.jwt.sign(payload)
    
    // Generate refresh token (7 days) - different secret for security
    const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'supersecretjwt'
    const refreshPayload = { sub: user.id, type: 'refresh' }
    const refreshToken = this.jwt.sign(refreshPayload, {
      secret: refreshTokenSecret,
      expiresIn: '7d',
    })

    return {
      access_token: accessToken,
      refresh_token: refreshToken, // Also return in response for flexibility
    }
  }

  async refreshAccessToken(refreshToken: string) {
    try {
      const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'supersecretjwt'
      
      // Verify refresh token
      const payload = this.jwt.verify(refreshToken, {
        secret: refreshTokenSecret,
      })

      // Check token type
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type')
      }

      // Get user info
      const user = await this.candidatesService.findOne(payload.sub)
      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      // Generate new access token
      const newPayload = {
        email: user.email || user.candidateEmail,
        sub: user.id,
        type: 'access',
      }
      const accessToken = this.jwt.sign(newPayload)

      return {
        access_token: accessToken,
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token')
    }
  }
}