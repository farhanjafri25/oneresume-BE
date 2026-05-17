import { PrismaService } from '../../prisma/prisma.service';
import { CreateVariantDto } from './dto/create-variant.dto';
export declare class VariantService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateVariantDto): Promise<{
        id: string;
        slug: string;
        isDefault: boolean;
        resumeId: string;
    }>;
    findByResumeId(resumeId: string): Promise<({
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
    })[]>;
    findById(id: string): Promise<{
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
    }>;
}
