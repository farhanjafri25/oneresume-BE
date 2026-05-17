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
exports.VariantService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let VariantService = class VariantService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const resume = await this.prisma.resume.findUnique({ where: { id: dto.resumeId } });
        if (!resume)
            throw new common_1.NotFoundException('Resume not found');
        const existing = await this.prisma.variant.findUnique({
            where: { resumeId_slug: { resumeId: dto.resumeId, slug: dto.slug } },
        });
        if (existing)
            throw new common_1.ConflictException(`Variant "${dto.slug}" already exists for this resume`);
        return this.prisma.variant.create({
            data: {
                resumeId: dto.resumeId,
                slug: dto.slug,
                isDefault: dto.isDefault ?? false,
            },
        });
    }
    async findByResumeId(resumeId) {
        return this.prisma.variant.findMany({
            where: { resumeId },
            include: {
                versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
            },
            orderBy: { slug: 'asc' },
        });
    }
    async findById(id) {
        const variant = await this.prisma.variant.findUnique({
            where: { id },
            include: { versions: { orderBy: { versionNumber: 'desc' } } },
        });
        if (!variant)
            throw new common_1.NotFoundException('Variant not found');
        return variant;
    }
};
exports.VariantService = VariantService;
exports.VariantService = VariantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VariantService);
//# sourceMappingURL=variant.service.js.map