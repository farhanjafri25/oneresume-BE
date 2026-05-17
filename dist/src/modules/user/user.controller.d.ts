import { UserService } from './user.service';
import { AuthenticatedUser } from '../auth/auth.types';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    findByUsername(username: string): Promise<{
        id: string;
        username: string;
        email: string;
        createdAt: Date;
    }>;
    getMyResumes(user: AuthenticatedUser): Promise<({
        variants: ({
            versions: {
                id: string;
                createdAt: Date;
                versionNumber: number;
                variantId: string;
                fileUrl: string;
                publicId: string;
            }[];
        } & {
            id: string;
            slug: string;
            isDefault: boolean;
            resumeId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        slug: string;
    })[]>;
}
