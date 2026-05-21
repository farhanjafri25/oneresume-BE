import { ConfigService } from '@nestjs/config';
import { VersionService } from '../version/version.service';
export interface UploadResult {
    fileUrl: string;
    fileKey: string;
    versionNumber: number;
}
export declare class UploadService {
    private readonly config;
    private readonly versionService;
    private readonly utapi;
    constructor(config: ConfigService, versionService: VersionService);
    uploadAndCreateVersion(file: Express.Multer.File, userId: string, resumeId: string, variantId: string): Promise<UploadResult>;
    deleteFiles(fileKeys: string | string[]): Promise<void>;
}
