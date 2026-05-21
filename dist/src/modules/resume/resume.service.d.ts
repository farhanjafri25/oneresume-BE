import { PrismaService } from '../../prisma/prisma.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { UploadService } from '../upload/upload.service';
export declare class ResumeService {
    private readonly prisma;
    private readonly uploadService;
    constructor(prisma: PrismaService, uploadService: UploadService);
    create(dto: CreateResumeDto): Promise<{
        variants: {
            id: string;
            slug: string;
            resumeId: string;
            isDefault: boolean;
        }[];
    } & {
        id: string;
        userId: string;
        title: string;
        slug: string;
        createdAt: Date;
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
        userId: string;
        title: string;
        slug: string;
        createdAt: Date;
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
        userId: string;
        title: string;
        slug: string;
        createdAt: Date;
    }>;
    delete(id: string): Promise<{
        id: string;
        userId: string;
        title: string;
        slug: string;
        createdAt: Date;
    }>;
}
