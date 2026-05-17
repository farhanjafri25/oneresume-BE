import { ResumeService } from './resume.service';
import { CreateResumeDto } from './dto/create-resume.dto';
import { AuthenticatedUser } from '../auth/auth.types';
export declare class ResumeController {
    private readonly resumeService;
    constructor(resumeService: ResumeService);
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
    findMyResumes(user: AuthenticatedUser): Promise<({
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
    findByUser(userId: string): Promise<({
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
    findOne(id: string): Promise<{
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
