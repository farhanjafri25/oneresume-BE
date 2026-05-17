import { PrismaService } from '../../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';
export declare class ResumeService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateResumeDto): Promise<{
        variants: {
            id: string;
            slug: string;
            resumeId: string;
            isDefault: boolean;
        }[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        title: string;
        slug: string;
    }>;
    findByUserId(userId: string): Promise<({
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
            resumeId: string;
            isDefault: boolean;
        })[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        title: string;
        slug: string;
    })[]>;
    findById(id: string): Promise<{
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
            resumeId: string;
            isDefault: boolean;
        })[];
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        title: string;
        slug: string;
    }>;
}
