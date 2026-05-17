import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    signup(dto: SignupDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            username: string;
            email: string;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        user: {
            id: string;
            username: string;
            email: string;
        };
    }>;
    getMe(userId: string): Promise<{
        id: string;
        username: string;
        email: string;
        createdAt: Date;
    }>;
    private buildTokenResponse;
}
