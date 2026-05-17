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
exports.ResumeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ResumeService = class ResumeService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const existing = await this.prisma.resume.findUnique({ where: { slug: dto.slug } });
        if (existing)
            throw new common_1.ConflictException('Resume slug already taken');
        const resume = await this.prisma.resume.create({
            data: { userId: dto.userId, slug: dto.slug },
        });
        await this.prisma.variant.create({
            data: {
                resumeId: resume.id,
                slug: 'default',
                isDefault: true,
            },
        });
        return this.prisma.resume.findUnique({
            where: { id: resume.id },
            include: { variants: true },
        });
    }
    async findByUserId(userId) {
        return this.prisma.resume.findMany({
            where: { userId },
            include: { variants: { include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id) {
        const resume = await this.prisma.resume.findUnique({
            where: { id },
            include: { variants: { include: { versions: { orderBy: { versionNumber: 'desc' } } } } },
        });
        if (!resume)
            throw new common_1.NotFoundException('Resume not found');
        return resume;
    }
};
exports.ResumeService = ResumeService;
exports.ResumeService = ResumeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ResumeService);
//# sourceMappingURL=resume.service.js.map