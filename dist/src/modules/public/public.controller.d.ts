import { PublicService } from './public.service';
export declare class PublicController {
    private readonly publicService;
    constructor(publicService: PublicService);
    getLatestResume(username: string, filename: string): Promise<import("./public.service").ResolvedResume>;
    getSpecificVersion(username: string, filename: string, version: string): Promise<import("./public.service").ResolvedResume>;
}
