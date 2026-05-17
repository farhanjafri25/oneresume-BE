import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from './auth.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    getMe(user: AuthenticatedUser): Promise<{
        id: string;
        username: string;
        email: string;
        createdAt: Date;
    }>;
}
