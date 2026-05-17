import { VersionService } from './version.service';
import { CreateVersionDto } from './dto/create-version.dto';
export declare class VersionController {
    private readonly versionService;
    constructor(versionService: VersionService);
    create(dto: CreateVersionDto): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: number;
        variantId: string;
        fileUrl: string;
        publicId: string;
    }>;
    findAll(variantId: string): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: number;
        variantId: string;
        fileUrl: string;
        publicId: string;
    }[]>;
    findOne(variantId: string, versionNumber: number): Promise<{
        id: string;
        createdAt: Date;
        versionNumber: number;
        variantId: string;
        fileUrl: string;
        publicId: string;
    }>;
}
