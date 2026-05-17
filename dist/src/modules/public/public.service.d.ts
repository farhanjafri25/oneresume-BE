import { PrismaService } from '../../prisma/prisma.service';
export interface ResolvedResume {
    username: string;
    variant: string;
    versionNumber: number;
    fileUrl: string;
    publicId: string;
    totalVersions: number;
    allVariants: string[];
}
export declare class PublicService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getLatest(username: string, variantSlug?: string): Promise<ResolvedResume>;
    getSpecific(username: string, variantSlug: string, versionNumber: number): Promise<ResolvedResume>;
    private resolveVariant;
    private buildResponse;
}
