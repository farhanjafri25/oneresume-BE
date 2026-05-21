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
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const server_1 = require("uploadthing/server");
const version_service_1 = require("../version/version.service");
let UploadService = class UploadService {
    constructor(config, versionService) {
        this.config = config;
        this.versionService = versionService;
        this.utapi = new server_1.UTApi({
            token: this.config.getOrThrow('UPLOADTHING_TOKEN'),
        });
    }
    async uploadAndCreateVersion(file, userId, resumeId, variantId) {
        if (!file?.buffer) {
            throw new common_1.BadRequestException('No file provided');
        }
        if (file.mimetype !== 'application/pdf') {
            throw new common_1.BadRequestException('Only PDF files are allowed');
        }
        const latest = await this.versionService.peekLatestVersionNumber(variantId);
        const nextVersion = latest !== null ? latest + 1 : 1;
        const fileName = `${userId}/${resumeId}/${variantId}/v${nextVersion}.pdf`;
        const arrayBuffer = file.buffer.buffer.slice(file.buffer.byteOffset, file.buffer.byteOffset + file.buffer.byteLength);
        const utFile = new server_1.UTFile([arrayBuffer], fileName, {
            type: 'application/pdf',
        });
        const response = await this.utapi.uploadFiles(utFile);
        if (response.error) {
            throw new common_1.InternalServerErrorException(`UploadThing error: ${response.error.message}`);
        }
        const { url, key } = response.data;
        const version = await this.versionService.create({
            variantId,
            fileUrl: url,
            publicId: key,
        });
        return {
            fileUrl: version.fileUrl,
            fileKey: version.publicId,
            versionNumber: version.versionNumber,
        };
    }
    async deleteFiles(fileKeys) {
        try {
            if (Array.isArray(fileKeys) && fileKeys.length === 0)
                return;
            await this.utapi.deleteFiles(fileKeys);
        }
        catch (err) {
            console.error('Failed to delete files from UploadThing:', err);
        }
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        version_service_1.VersionService])
], UploadService);
//# sourceMappingURL=upload.service.js.map