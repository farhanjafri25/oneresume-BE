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
exports.VersionController = void 0;
const common_1 = require("@nestjs/common");
const version_service_1 = require("./version.service");
const create_version_dto_1 = require("./dto/create-version.dto");
let VersionController = class VersionController {
    constructor(versionService) {
        this.versionService = versionService;
    }
    create(dto) {
        return this.versionService.create(dto);
    }
    findAll(variantId) {
        return this.versionService.findByVariantId(variantId);
    }
    findOne(variantId, versionNumber) {
        return this.versionService.findSpecific(variantId, versionNumber);
    }
};
exports.VersionController = VersionController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_version_dto_1.CreateVersionDto]),
    __metadata("design:returntype", void 0)
], VersionController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('variant/:variantId'),
    __param(0, (0, common_1.Param)('variantId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], VersionController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('variant/:variantId/v/:versionNumber'),
    __param(0, (0, common_1.Param)('variantId')),
    __param(1, (0, common_1.Param)('versionNumber', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", void 0)
], VersionController.prototype, "findOne", null);
exports.VersionController = VersionController = __decorate([
    (0, common_1.Controller)('versions'),
    __metadata("design:paramtypes", [version_service_1.VersionService])
], VersionController);
//# sourceMappingURL=version.controller.js.map