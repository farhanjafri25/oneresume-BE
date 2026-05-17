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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VariantController = void 0;
const common_1 = require("@nestjs/common");
const variant_service_1 = require("./variant.service");
const create_variant_dto_1 = require("./dto/create-variant.dto");
let VariantController = class VariantController {
    constructor(variantService) {
        this.variantService = variantService;
    }
    create(resumeId, dto) {
        dto.resumeId = resumeId;
        return this.variantService.create(dto);
    }
    findAll(resumeId) {
        return this.variantService.findByResumeId(resumeId);
    }
    findOne(variantId) {
        return this.variantService.findById(variantId);
    }
};
exports.VariantController = VariantController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Param)('resumeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_variant_dto_1.CreateVariantDto]),
    __metadata("design:returntype", void 0)
], VariantController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('resumeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VariantController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':variantId'),
    __param(0, (0, common_1.Param)('variantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VariantController.prototype, "findOne", null);
exports.VariantController = VariantController = __decorate([
    (0, common_1.Controller)('resumes/:resumeId/variants'),
    __metadata("design:paramtypes", [variant_service_1.VariantService])
], VariantController);
//# sourceMappingURL=variant.controller.js.map