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
exports.VersionService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let VersionService = class VersionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const variant = await this.prisma.variant.findUnique({
            where: { id: dto.variantId },
        });
        if (!variant)
            throw new common_1.NotFoundException('Variant not found');
        return this.prisma.$transaction(async (tx) => {
            const latest = await tx.version.findFirst({
                where: { variantId: dto.variantId },
                orderBy: { versionNumber: 'desc' },
            });
            const nextVersionNumber = latest ? latest.versionNumber + 1 : 1;
            return tx.version.create({
                data: {
                    variantId: dto.variantId,
                    versionNumber: nextVersionNumber,
                    fileUrl: dto.fileUrl,
                    publicId: dto.publicId,
                },
            });
        });
    }
    async findByVariantId(variantId) {
        return this.prisma.version.findMany({
            where: { variantId },
            orderBy: { versionNumber: 'desc' },
        });
    }
    async findSpecific(variantId, versionNumber) {
        const version = await this.prisma.version.findUnique({
            where: { variantId_versionNumber: { variantId, versionNumber } },
        });
        if (!version)
            throw new common_1.NotFoundException(`Version ${versionNumber} not found`);
        return version;
    }
    async findLatest(variantId) {
        const version = await this.prisma.version.findFirst({
            where: { variantId },
            orderBy: { versionNumber: 'desc' },
        });
        if (!version)
            throw new common_1.NotFoundException('No versions found for this variant');
        return version;
    }
    async peekLatestVersionNumber(variantId) {
        const latest = await this.prisma.version.findFirst({
            where: { variantId },
            orderBy: { versionNumber: 'desc' },
            select: { versionNumber: true },
        });
        return latest?.versionNumber ?? null;
    }
};
exports.VersionService = VersionService;
exports.VersionService = VersionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VersionService);
//# sourceMappingURL=version.service.js.map