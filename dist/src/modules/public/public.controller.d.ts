import { PublicService } from './public.service';
export declare class PublicController {
    private readonly publicService;
    constructor(publicService: PublicService);
    getDefaultLatest(username: string): Promise<import("./public.service").ResolvedResume>;
    getVariantLatest(username: string, variant: string): Promise<import("./public.service").ResolvedResume>;
    getSpecificVersion(username: string, variant: string, version: number): Promise<import("./public.service").ResolvedResume>;
}
