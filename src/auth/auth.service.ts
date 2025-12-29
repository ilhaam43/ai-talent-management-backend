import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import { SignupDto } from './dto/signup.dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async signup(signupDto: SignupDto) {
    try {
      const { email, name, password } = signupDto

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new ConflictException('Email already registered')
      }

      // Hash password
      const saltRounds = 10
      const hashedPassword = await bcrypt.hash(password, saltRounds)

      // Create user and candidate in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email,
            name,
            password: hashedPassword,
          },
        })

        // Create candidate profile
        const candidate = await tx.candidate.create({
          data: {
            userId: user.id,
            candidateFullname: name,
            candidateEmail: email,
          },
        })

        return { user, candidate }
      })

      // Generate tokens for auto-login
      const payload = {
        email: result.user.email,
        sub: result.user.id,
        candidateId: result.candidate.id,
        role: 'CANDIDATE',
        type: 'access'
      }

      const accessToken = this.jwt.sign(payload)

      const refreshTokenSecret = this.configService.get<string>('JWT_REFRESH_SECRET') || this.configService.get<string>('JWT_SECRET') || 'supersecretjwt'
      const refreshPayload = { sub: result.user.id, type: 'refresh' }
      const refreshToken = this.jwt.sign(refreshPayload, {
        secret: refreshTokenSecret,
        expiresIn: '7d',
      })

      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          candidateId: result.candidate.id,
          role: 'CANDIDATE',
        },
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error
      }
      console.error('Signup error:', error)
      throw new BadRequestException('Failed to create account')
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    try {
      // Find User by email (User table has unique email)
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          candidates: true, // Include candidate profile if exists
          employees: {
            include: {
              userRole: true
            }
          }
        },
      })

      if (!user) {
        console.log(`User not found: ${email}`)
        return null
      }

      if (!user.password) {
        console.log(`User has no password: ${email}`)
        return null
      }

      const isPasswordValid = await bcrypt.compare(pass, user.password)
      if (!isPasswordValid) {
        console.log(`Invalid password for: ${email}`)
        return null
      }

      // Get candidate profile if exists
      const candidate = user.candidates?.[0] || null
      // Get employee profile/role if exists
      const employee = user.employees?.[0] || null
      const role = employee?.userRole?.roleName || (candidate ? 'CANDIDATE' : 'USER')

      // Return user with candidate info
      const { password, ...userWithoutPassword } = user
      return {
        ...userWithoutPassword,
        candidateId: candidate?.id || null,
        candidateEmail: candidate?.candidateEmail || user.email,
        role: role
      }
    } catch (error) {
      console.error('validateUser error:', error)
      return null
    }
  }

  async login(user: any) {
    try {
      if (!user || !user.id) {
        throw new Error('Invalid user object in login')
      }

      const payload = {
        email: user.email || user.candidateEmail,
        sub: user.id,
        candidateId: user.candidateId,
        role: user.role,
        type: 'access'
      }

      // Generate access token (1 hour)
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
    } catch (error) {
      console.error('login error:', error)
      throw error
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
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          candidates: true,
          employees: {
            include: { userRole: true }
          }
        },
      })
      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      const candidate = user.candidates?.[0] || null

      // Generate new access token
      const newPayload = {
        email: user.email,
        sub: user.id,
        role: user.employees?.[0]?.userRole?.roleName || (user.candidates?.length > 0 ? 'CANDIDATE' : 'USER'),
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