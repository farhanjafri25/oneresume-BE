import { VariantService } from './variant.service';
import { CreateVariantDto } from './dto/create-variant.dto';
export declare class VariantController {
    private readonly variantService;
    constructor(variantService: VariantService);
    create(resumeId: string, dto: CreateVariantDto): Promise<{
        id: string;
        slug: string;
        isDefault: boolean;
        resumeId: string;
    }>;
    findAll(resumeId: string): Promise<({
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
    findOne(variantId: string): Promise<{
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
