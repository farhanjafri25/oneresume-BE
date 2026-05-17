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
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const public_service_1 = require("./public.service");
const public_decorator_1 = require("../auth/decorators/public.decorator");
let PublicController = class PublicController {
    constructor(publicService) {
        this.publicService = publicService;
    }
    getLatestResume(username, filename) {
        return this.publicService.getLatest(username, filename);
    }
    getSpecificVersion(username, filename, version) {
        return this.publicService.getSpecific(username, filename, version);
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)(':username/:filename'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Param)('filename')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getLatestResume", null);
__decorate([
    (0, common_1.Get)(':username/:filename/:version'),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Param)('version')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], PublicController.prototype, "getSpecificVersion", null);
exports.PublicController = PublicController = __decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [public_service_1.PublicService])
], PublicController);
//# sourceMappingURL=public.controller.js.map