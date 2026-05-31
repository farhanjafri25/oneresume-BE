import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './auth.types';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
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

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
      },
    });

    return this.buildTokenResponse(user);
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      // Same generic message — don't reveal which field was wrong
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.buildTokenResponse(user);
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
