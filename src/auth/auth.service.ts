import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common'
import { PrismaService } from '../database/prisma.service'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import { SignupDto } from './dto/signup.dto'
import { HrSignupDto } from './dto/hr-signup.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'
import { EmailService } from '../email/email.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
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
              userRole: true,
              company: true,
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

      // Get employee profile/role if exists
      const employee = user.employees?.[0] || null;
      let candidate = user.candidates?.[0] || null;

      // If not an employee and candidate record doesn't exist yet, auto-create it
      if (!employee && !candidate) {
        candidate = await this.prisma.candidate.create({
          data: {
            userId: user.id,
            candidateFullname: user.name,
            candidateEmail: user.email,
          },
        });
      }

      const role = employee?.userRole?.roleName || 'CANDIDATE';

      // Block unverified HR/Employee users from logging in
      if (employee && !user.isVerified) {
        throw new ForbiddenException('Please verify your email before logging in.')
      }

      // Return user with candidate & company info
      const { password, ...userWithoutPassword } = user
      return {
        ...userWithoutPassword,
        candidateId: candidate?.id || null,
        candidateEmail: candidate?.candidateEmail || user.email,
        role: role,
        company: employee?.company ? {
          id: employee.company.id,
          name: employee.company.name,
          logoUrl: employee.company.logoUrl,
        } : null,
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
        name: user.name,
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
      const role = user.employees?.[0]?.userRole?.roleName || 'CANDIDATE';
      const newPayload = {
        email: user.email,
        sub: user.id,
        candidateId: candidate?.id || null,
        role,
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
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    // 1. Fetch user
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !user.password) {
      throw new UnauthorizedException('User not found')
    }

    // 2. Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect')
    }

    // 3. Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    })

    return { message: 'Password changed successfully' }
  }

  async setPasswordFromToken(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    })

    if (!user) {
      throw new BadRequestException('Invalid or expired token')
    }

    const saltRounds = 10
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds)

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordSetRequired: false,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    })

    return { message: 'Password set successfully' }
  }

  // ─── HR Signup + OTP Verification ──────────────────────────────────────────

  async hrSignup(dto: HrSignupDto) {
    const { email, name, password, companyName } = dto

    // 1. Duplicate email check
    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ConflictException('Email already registered')
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 3. Generate 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999))
    const hashedOtp = await bcrypt.hash(otp, 10)
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // 4. Transaction: User + Employee + Company
    await this.prisma.$transaction(async (tx) => {
      // Create User (unverified)
      const user = await tx.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          isVerified: false,
          otpCode: hashedOtp,
          otpExpiry,
        },
      })

      // Create Company (first HR user becomes the HR Admin)
      const company = await tx.company.create({
        data: {
          name: companyName,
          hrAdminId: user.id,
        },
      })

      // Find HUMAN RESOURCES role
      const hrRole = await tx.userRole.findFirst({
        where: { roleName: 'HUMAN RESOURCES' },
      })
      if (!hrRole) {
        throw new InternalServerErrorException(
          'HUMAN RESOURCES role not found. Please run the HR seeder.'
        )
      }

      // Find default EmployeePosition
      const position =
        (await tx.employeePosition.findFirst({ where: { employeePosition: 'OFFICER' } })) ??
        (await tx.employeePosition.findFirst())
      if (!position) {
        throw new InternalServerErrorException(
          'No EmployeePosition found. Please run the employee-positions seeder.'
        )
      }

      // Auto-generate EIN
      const ein = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`

      await tx.employee.create({
        data: {
          userId: user.id,
          userRoleId: hrRole.id,
          employeePositionId: position.id,
          employeeIdentificationNumber: ein,
          companyId: company.id,
        },
      })
    })

    // 5. Send OTP email
    try {
      await this.emailService.sendOtpEmail(email, name, otp)
    } catch (err) {
      // Roll back by deleting the user — keeps the flow atomic
      await this.prisma.user.delete({ where: { email } }).catch(() => null)
      throw new InternalServerErrorException(
        'Failed to send verification email. Please try again.'
      )
    }

    return { message: 'OTP sent to your email. Please verify to continue.' }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const { email, otp } = dto

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        employees: { include: { userRole: true } },
        candidates: true,
      },
    })
    if (!user) throw new NotFoundException('User not found')

    if (user.isVerified) {
      throw new BadRequestException('Email already verified')
    }

    if (!user.otpCode || !user.otpExpiry) {
      throw new UnauthorizedException('No OTP pending. Please sign up again.')
    }

    if (user.otpExpiry < new Date()) {
      throw new UnauthorizedException('OTP has expired. Please request a new one.')
    }

    const isOtpValid = await bcrypt.compare(otp, user.otpCode)
    if (!isOtpValid) {
      throw new UnauthorizedException('Invalid OTP code.')
    }

    // Mark verified, clear OTP fields
    await this.prisma.user.update({
      where: { email },
      data: { isVerified: true, otpCode: null, otpExpiry: null },
    })

    // Generate tokens
    const employee = user.employees?.[0]
    const role = employee?.userRole?.roleName || 'HUMAN RESOURCES'
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role,
      type: 'access',
    }
    const accessToken = this.jwt.sign(payload)

    const refreshTokenSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ??
      this.configService.get<string>('JWT_SECRET') ??
      'supersecretjwt'
    const refreshToken = this.jwt.sign(
      { sub: user.id, type: 'refresh' },
      { secret: refreshTokenSecret, expiresIn: '7d' },
    )

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role },
    }
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) throw new NotFoundException('User not found')
    if (user.isVerified) throw new BadRequestException('Email is already verified')

    const otp = String(crypto.randomInt(100000, 999999))
    const hashedOtp = await bcrypt.hash(otp, 10)
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000)

    await this.prisma.user.update({
      where: { email },
      data: { otpCode: hashedOtp, otpExpiry },
    })

    await this.emailService.sendOtpEmail(email, user.name, otp)

    return { message: 'A new OTP has been sent to your email.' }
  }
}