"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PublicService = class PublicService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getLatest(username, filename) {
        const { variant } = await this.resolveVariant(username, filename);
        const version = await this.prisma.version.findFirst({
            where: { variantId: variant.id },
            orderBy: { versionNumber: 'desc' },
        });
        if (!version) {
            throw new common_1.NotFoundException('No versions found for this resume');
        }
        return this.buildResponse(username, variant, version, variant.resume);
    }
    async getSpecific(username, filename, versionParam) {
        const { variant } = await this.resolveVariant(username, filename);
        let versionNumber;
        if (typeof versionParam === 'string') {
            const stripped = versionParam.startsWith('v') ? versionParam.slice(1) : versionParam;
            versionNumber = parseInt(stripped, 10);
        }
        else {
            versionNumber = versionParam;
        }
        if (isNaN(versionNumber)) {
            throw new common_1.BadRequestException(`Invalid version format: ${versionParam}`);
        }
        const version = await this.prisma.version.findUnique({
            where: {
                variantId_versionNumber: {
                    variantId: variant.id,
                    versionNumber,
                },
            },
        });
        if (!version) {
            throw new common_1.NotFoundException(`Version ${versionNumber} not found`);
        }
        return this.buildResponse(username, variant, version, variant.resume);
    }
    async resolveVariant(username, filename, variantSlug = 'default') {
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user)
            throw new common_1.NotFoundException(`User "${username}" not found`);
        const resume = await this.prisma.resume.findUnique({
            where: {
                userId_slug: {
                    userId: user.id,
                    slug: filename,
                },
            },
            include: {
                variants: {
                    include: {
                        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
                    },
                },
            },
        });
        if (!resume)
            throw new common_1.NotFoundException(`Resume "${filename}" not found for user "${username}"`);
        const variant = await this.prisma.variant.findUnique({
            where: {
                resumeId_slug: {
                    resumeId: resume.id,
                    slug: variantSlug,
                },
            },
            include: { resume: true },
        });
        if (!variant)
            throw new common_1.NotFoundException(`Variant "${variantSlug}" not found`);
        return { variant, user, resume };
    }
    async buildResponse(username, variant, version, resume) {
        const totalVersions = await this.prisma.version.count({
            where: { variantId: variant.id },
        });
        const allVariants = await this.prisma.variant.findMany({
            where: { resumeId: variant.resumeId },
            select: { slug: true },
            orderBy: { slug: 'asc' },
        });
        return {
            username,
            variant: variant.slug,
            versionNumber: version.versionNumber,
            fileUrl: version.fileUrl,
            publicId: version.publicId,
            totalVersions,
            allVariants: allVariants.map((v) => v.slug),
        };
    }
};
exports.PublicService = PublicService;
exports.PublicService = PublicService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicService);
//# sourceMappingURL=public.service.js.map