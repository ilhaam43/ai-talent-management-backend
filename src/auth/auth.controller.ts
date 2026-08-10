import { Controller, Post, UseGuards, Req, Get, Body, Res, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { AuthGuard } from '@nestjs/passport'
import { ApiBody, ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { Response } from 'express'
import { AuthService } from './auth.service'
import { SignupDto } from './dto/signup.dto'
import { SetPasswordDto } from './dto/set-password.dto'
import { HrSignupDto } from './dto/hr-signup.dto'
import { VerifyOtpDto } from './dto/verify-otp.dto'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('signup')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new candidate account' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async signup(@Body() signupDto: SignupDto, @Res({ passthrough: true }) res: Response) {
    try {
      const result = await this.authService.signup(signupDto)

      // Set refresh token in httpOnly cookie
      const isProduction = process.env.NODE_ENV === 'production'
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      })

      // Return access token and user info (refresh token is in cookie)
      return {
        access_token: result.access_token,
        expires_in: 3600, // 1 hour in seconds
        user: result.user,
      }
    } catch (error) {
      console.error('Signup error:', error)
      throw error
    }
  }

  @Post('login')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @UseGuards(AuthGuard('local'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and get access token + refresh token' })
  @ApiBody({ schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    try {
      if (!req.user) {
        throw new UnauthorizedException('User not found in request')
      }

      const tokens = await this.authService.login(req.user)

      // Set refresh token in httpOnly cookie
      const isProduction = process.env.NODE_ENV === 'production'
      res.cookie('refresh_token', tokens.refresh_token, {
        httpOnly: true, // Prevents XSS attacks
        secure: isProduction, // Only send over HTTPS in production
        sameSite: 'strict', // CSRF protection
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
        path: '/',
      })

      // Return access token and user info
      return {
        access_token: tokens.access_token,
        expires_in: 3600, // 1 hour in seconds
        user: req.user,
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token from cookie' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refresh_token

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found')
    }

    try {
      const tokens = await this.authService.refreshAccessToken(refreshToken)
      return {
        access_token: tokens.access_token,
        expires_in: 3600, // 1 hour in seconds
      }
    } catch (error) {
      // Clear invalid refresh token cookie
      res.clearCookie('refresh_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      })
      throw error
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear refresh token cookie' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Res({ passthrough: true }) res: Response) {
    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    })

    return {
      message: 'Logout successful',
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  profile(@Req() req: any) {
    return req.user
  }

  @Post('change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for the logged-in user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  async changePassword(@Req() req: any, @Body() body: { currentPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.id, body.currentPassword, body.newPassword)
  }

  @Post('set-password')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set password using reset token (e.g. for converted candidates)' })
  @ApiResponse({ status: 200, description: 'Password set successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async setPassword(@Body() setPasswordDto: SetPasswordDto) {
    return this.authService.setPasswordFromToken(setPasswordDto.token, setPasswordDto.password)
  }

  // ─── HR Signup + OTP ───────────────────────────────────────────────────────

  @Post('hr-signup')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new HR user account (sends OTP for verification)' })
  @ApiResponse({ status: 201, description: 'OTP sent to email' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async hrSignup(@Body() dto: HrSignupDto) {
    return this.authService.hrSignup(dto)
  }

  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and activate HR account' })
  @ApiResponse({ status: 200, description: 'Account verified, tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(dto)

    const isProduction = process.env.NODE_ENV === 'production'
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })

    return {
      access_token: result.access_token,
      expires_in: 3600,
      user: result.user,
    }
  }

  @Post('resend-otp')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend OTP to email (3 per minute max)' })
  @ApiResponse({ status: 200, description: 'OTP resent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendOtp(@Body() body: { email: string }) {
    return this.authService.resendOtp(body.email)
  }
}
