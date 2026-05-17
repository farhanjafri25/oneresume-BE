import { PrismaService } from '../../prisma/prisma.service';
import { CreateVersionDto } from './dto/create-version.dto';
export declare class VersionService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateVersionDto): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: number;
        variantId: string;
        fileUrl: string;
        publicId: string;
    }>;
    findByVariantId(variantId: string): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: number;
        variantId: string;
        fileUrl: string;
        publicId: string;
    }[]>;
    findSpecific(variantId: string, versionNumber: number): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: number;
        variantId: string;
        fileUrl: string;
        publicId: string;
    }>;
    findLatest(variantId: string): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: number;
        variantId: string;
        fileUrl: string;
        publicId: string;
    }>;
    peekLatestVersionNumber(variantId: string): Promise<number | null>;
}
