import { PrismaService } from '../../prisma/prisma.service';
export declare class UserService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findByUsername(username: string): Promise<{
        id: string;
        username: string;
        email: string;
        createdAt: Date;
    }>;
    findById(id: string): Promise<{
        id: string;
        username: string;
        email: string;
        createdAt: Date;
    }>;
    findResumesByUserId(userId: string): Promise<({
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
