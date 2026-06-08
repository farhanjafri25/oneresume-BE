import { Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { JwtPayload } from './auth.types';
import { Resend } from 'resend';

const BCRYPT_ROUNDS = 12;

const getOtpEmailTemplate = (otp: string) => `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; padding: 40px 20px; color: #111827;">
  <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
    <div style="padding: 32px; text-align: center;">
      <h1 style="margin-top: 0; font-size: 24px; font-weight: 700; color: #111827;">Welcome to OneCV!</h1>
      <p style="font-size: 16px; color: #4b5563; line-height: 1.5; margin-bottom: 24px;">
        Thanks for signing up. Please use the verification code below to securely verify your email address.
      </p>
      <div style="background-color: #f3f4f6; padding: 16px 24px; border-radius: 6px; display: inline-block; letter-spacing: 4px; font-size: 28px; font-weight: 800; color: #4f46e5; margin-bottom: 24px;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 0;">
        This code will expire in 15 minutes.<br/>If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>
</div>
`;

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly resend: Resend;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
    const resendApiKey = this.config.get<string>('RESEND_API_KEY');
    this.resend = new Resend(resendApiKey || 'dummy_key');
  }

  // ─── Google Login ─────────────────────────────────────────────────────────────

  async googleLogin(googleToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleToken,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      });
      
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token payload');
      }

      const { email, name } = payload;

      // Check if user already exists
      let user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Auto-generate a unique username
        const baseUsername = (name || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        
        let username = baseUsername;
        let suffix = 1;
        
        // Ensure username uniqueness
        while (await this.prisma.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${suffix++}`;
        }

        // Create new user without a password
        user = await this.prisma.user.create({
          data: {
            email,
            username,
            password: null, // Null is allowed now
            isVerified: true, // Google accounts are implicitly verified
          },
        });
      }

      return this.buildTokenResponse(user);
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof UnauthorizedException ? error.message : 'Google authentication failed',
      );
    }
  }

  // ─── Signup ──────────────────────────────────────────────────────────────────

  async signup(dto: SignupDto) {
    // Uniqueness checks
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email
          ? 'Email already in use'
          : 'Username already taken',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Generate 6 digit OTP
    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
        isVerified: false,
        otpCode: hashedOtp,
        otpExpiresAt: expiresAt,
      },
    });

    // Send email via Resend
    try {
      await this.resend.emails.send({
        from: 'OneResume <hello@no-reply.onecv.co>', // In production, use verified domain e.g. hello@yourdomain.com
        to: user.email,
        subject: 'Verify your OneCV account',
        html: getOtpEmailTemplate(rawOtp),
      });
    } catch (error) {
      console.error('Failed to send verification email', error);
    }

    return { message: 'OTP sent to email', requiresOtp: true, email: user.email };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found, try signing up instead');
    }

    if (!user.password) {
      throw new UnauthorizedException('Account has a different login method');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      // Same generic message — don't reveal which field was wrong
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in.');
    }

    return this.buildTokenResponse(user);
  }

  // ─── OTP Verification ───────────────────────────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid email or code');

    if (user.isVerified) {
      return this.buildTokenResponse(user);
    }

    if (!user.otpCode || !user.otpExpiresAt) {
      throw new BadRequestException('No verification code found. Please request a new one.');
    }

    if (user.otpExpiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    const isValid = await bcrypt.compare(dto.code, user.otpCode);
    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Mark as verified and clear OTP fields
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    return this.buildTokenResponse(updatedUser);
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Return success to prevent email enumeration
      return { message: 'If the email exists, a new code was sent.' };
    }

    if (user.isVerified) {
      return { message: 'User is already verified' };
    }

    const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(rawOtp, BCRYPT_ROUNDS);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: hashedOtp,
        otpExpiresAt: expiresAt,
      },
    });

    try {
      await this.resend.emails.send({
        from: 'OneCV <hello@no-reply.onecv.co>',
        to: user.email,
        subject: 'Your new verification code',
        html: getOtpEmailTemplate(rawOtp),
      });
    } catch (error) {
      console.error('Failed to resend verification email', error);
    }

    return { message: 'OTP sent to email' };
  }

  // ─── Me (fetch own profile) ───────────────────────────────────────────────────

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        // password is intentionally excluded
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    return user;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildTokenResponse(user: { id: string; username: string; email: string }) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwt.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  }
}
