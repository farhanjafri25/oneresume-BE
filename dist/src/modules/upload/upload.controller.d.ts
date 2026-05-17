import { UploadService } from './upload.service';
import { UploadResumeDto } from './dto/upload-resume.dto';
export declare class UploadController {
    private readonly uploadService;
    constructor(uploadService: UploadService);
    upload(file: Express.Multer.File, dto: UploadResumeDto): Promise<import("./upload.service").UploadResult>;
}
