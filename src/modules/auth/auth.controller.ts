import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/signup
   * Public — no token required
   * Returns: { accessToken, user }
   */
  @Public()
  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  /**
   * POST /api/auth/login
   * Public — no token required
   * Returns: { accessToken, user }
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK) // default is 201, override to 200 for login
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/auth/google
   * Public — no token required
   * Returns: { accessToken, user }
   */
  @Public()
  @Post('google')
  @HttpCode(HttpStatus.OK)
  googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.googleLogin(dto.googleToken, dto.isSignUp);
  }

  /**
   * POST /api/auth/verify-otp
   * Public — no token required
   * Returns: { accessToken, user }
   */
  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  /**
   * POST /api/auth/resend-otp
   * Public — no token required
   */
  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }


  /**
   * GET /api/auth/me
   * Protected — requires valid Bearer token
   * Returns the authenticated user's profile (no password)
   */
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}
