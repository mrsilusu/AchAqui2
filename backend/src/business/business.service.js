"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BusinessService = void 0;
var common_1 = require("@nestjs/common");
var crypto_1 = require("crypto");
var client_1 = require("@prisma/client");
var BusinessService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BusinessService = _classThis = /** @class */ (function () {
        function BusinessService_1(prisma) {
            this.prisma = prisma;
        }
        BusinessService_1.prototype.asMetadataObject = function (value) {
            return value && typeof value === 'object' && !Array.isArray(value)
                ? value
                : {};
        };
        BusinessService_1.prototype.searchNearby = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var latitude, longitude, radiusKm, radiusMeters;
                return __generator(this, function (_a) {
                    latitude = Number(params.latitude);
                    longitude = Number(params.longitude);
                    radiusKm = params.radiusKm ? Number(params.radiusKm) : 10;
                    if (Number.isNaN(latitude) ||
                        Number.isNaN(longitude) ||
                        Number.isNaN(radiusKm)) {
                        throw new common_1.BadRequestException('latitude, longitude e radiusKm devem ser numéricos.');
                    }
                    if (radiusKm <= 0) {
                        throw new common_1.BadRequestException('radiusKm deve ser maior que 0.');
                    }
                    radiusMeters = radiusKm * 1000;
                    return [2 /*return*/, this.prisma.$queryRaw(client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n        SELECT\n          b.\"id\",\n          b.\"name\",\n          b.\"category\",\n          b.\"description\",\n          b.\"latitude\",\n          b.\"longitude\",\n          ST_DistanceSphere(\n            ST_MakePoint(b.\"longitude\", b.\"latitude\"),\n            ST_MakePoint(", ", ", ")\n          ) AS distance_meters\n        FROM \"Business\" b\n        WHERE ST_DistanceSphere(\n          ST_MakePoint(b.\"longitude\", b.\"latitude\"),\n          ST_MakePoint(", ", ", ")\n        ) <= ", "\n        AND b.\"isActive\" = true\n        ORDER BY distance_meters ASC\n      "], ["\n        SELECT\n          b.\"id\",\n          b.\"name\",\n          b.\"category\",\n          b.\"description\",\n          b.\"latitude\",\n          b.\"longitude\",\n          ST_DistanceSphere(\n            ST_MakePoint(b.\"longitude\", b.\"latitude\"),\n            ST_MakePoint(", ", ", ")\n          ) AS distance_meters\n        FROM \"Business\" b\n        WHERE ST_DistanceSphere(\n          ST_MakePoint(b.\"longitude\", b.\"latitude\"),\n          ST_MakePoint(", ", ", ")\n        ) <= ", "\n        AND b.\"isActive\" = true\n        ORDER BY distance_meters ASC\n      "])), longitude, latitude, longitude, latitude, radiusMeters))];
                });
            });
        };
        BusinessService_1.prototype.findAll = function () {
            return this.prisma.business.findMany({
                where: { isActive: true },
                include: {
                    owner: {
                        select: { id: true, name: true },
                    },
                    htRoomTypes: {
                        select: {
                            id: true, name: true, description: true,
                            pricePerNight: true, maxGuests: true,
                            totalRooms: true, available: true,
                            amenities: true, photos: true,
                        },
                    },
                },
            });
        };
        BusinessService_1.prototype.searchByName = function (q, municipality) {
            return this.prisma.business.findMany({
                where: __assign({ isActive: true, name: { contains: q, mode: 'insensitive' } }, (municipality ? { municipality: { contains: municipality, mode: 'insensitive' } } : {})),
                select: {
                    id: true,
                    name: true,
                    category: true,
                    description: true,
                    municipality: true,
                    isClaimed: true,
                    source: true,
                    metadata: true,
                },
                take: 20,
                orderBy: { name: 'asc' },
            });
        };
        BusinessService_1.prototype.findOne = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var business;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findUnique({
                                where: { id: id },
                                include: {
                                    owner: {
                                        select: { id: true, name: true },
                                    },
                                    htRoomTypes: {
                                        select: {
                                            id: true, name: true, description: true,
                                            pricePerNight: true, maxGuests: true,
                                            totalRooms: true, available: true,
                                            amenities: true, photos: true,
                                        },
                                    },
                                },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            }
                            return [2 /*return*/, business];
                    }
                });
            });
        };
        BusinessService_1.prototype.create = function (ownerId, createBusinessDto) {
            var metadata = createBusinessDto.metadata, baseData = __rest(createBusinessDto, ["metadata"]);
            return this.prisma.business.create({
                data: __assign(__assign(__assign({}, baseData), (metadata !== undefined
                    ? { metadata: metadata }
                    : {})), { ownerId: ownerId }),
            });
        };
        BusinessService_1.prototype.update = function (id, ownerId, updateBusinessDto) {
            return __awaiter(this, void 0, void 0, function () {
                var business, metadata, baseData;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findFirst({
                                where: {
                                    id: id,
                                    ownerId: ownerId,
                                },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado para este proprietário.');
                            }
                            metadata = updateBusinessDto.metadata, baseData = __rest(updateBusinessDto, ["metadata"]);
                            return [2 /*return*/, this.prisma.business.update({
                                    where: { id: id },
                                    data: __assign(__assign({}, baseData), (metadata !== undefined
                                        ? { metadata: metadata }
                                        : {})),
                                })];
                    }
                });
            });
        };
        BusinessService_1.prototype.updateStatus = function (id, ownerId, isOpen) {
            return __awaiter(this, void 0, void 0, function () {
                var business, currentMetadata, metadata;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findFirst({
                                where: {
                                    id: id,
                                    ownerId: ownerId,
                                },
                                select: {
                                    id: true,
                                    metadata: true,
                                },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado para este proprietário.');
                            }
                            currentMetadata = business.metadata && typeof business.metadata === 'object'
                                ? business.metadata
                                : {};
                            metadata = __assign(__assign({}, currentMetadata), { isOpen: isOpen, statusText: isOpen ? 'Aberto agora' : 'Fechado' });
                            return [2 /*return*/, this.prisma.business.update({
                                    where: { id: id },
                                    data: { metadata: metadata },
                                })];
                    }
                });
            });
        };
        BusinessService_1.prototype.updateInfo = function (id, ownerId, updateBusinessInfoDto) {
            return __awaiter(this, void 0, void 0, function () {
                var business, dataToUpdate, currentMetadata, metadata;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findFirst({
                                where: { id: id, ownerId: ownerId },
                                select: { id: true, metadata: true },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado para este proprietário.');
                            }
                            dataToUpdate = {};
                            if (updateBusinessInfoDto.name)
                                dataToUpdate.name = updateBusinessInfoDto.name;
                            if (updateBusinessInfoDto.description)
                                dataToUpdate.description = updateBusinessInfoDto.description;
                            if (updateBusinessInfoDto.latitude !== undefined)
                                dataToUpdate.latitude = updateBusinessInfoDto.latitude;
                            if (updateBusinessInfoDto.longitude !== undefined)
                                dataToUpdate.longitude = updateBusinessInfoDto.longitude;
                            currentMetadata = this.asMetadataObject(business.metadata);
                            if (updateBusinessInfoDto.phone || updateBusinessInfoDto.email || updateBusinessInfoDto.website || updateBusinessInfoDto.address) {
                                metadata = __assign(__assign(__assign(__assign(__assign({}, currentMetadata), (updateBusinessInfoDto.phone && { phone: updateBusinessInfoDto.phone })), (updateBusinessInfoDto.email && { email: updateBusinessInfoDto.email })), (updateBusinessInfoDto.website && { website: updateBusinessInfoDto.website })), (updateBusinessInfoDto.address && { address: updateBusinessInfoDto.address }));
                                dataToUpdate.metadata = metadata;
                            }
                            return [2 /*return*/, this.prisma.business.update({
                                    where: { id: id },
                                    data: dataToUpdate,
                                })];
                    }
                });
            });
        };
        BusinessService_1.prototype.remove = function (id, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var business;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findFirst({
                                where: {
                                    id: id,
                                    ownerId: ownerId,
                                },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado para este proprietário.');
                            }
                            return [4 /*yield*/, this.prisma.business.delete({
                                    where: { id: id },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Estabelecimento removido com sucesso.' }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────────────────────────────────
        // PROMOTIONS METHODS (Secção 11 — Promo Manager)
        // ─────────────────────────────────────────────────────────────────────────
        BusinessService_1.prototype.getPromosByBusiness = function (businessId) {
            return __awaiter(this, void 0, void 0, function () {
                var business, metadata;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!businessId) {
                                throw new common_1.BadRequestException('businessId é obrigatório.');
                            }
                            return [4 /*yield*/, this.prisma.business.findUnique({
                                    where: { id: businessId },
                                    select: { metadata: true },
                                })];
                        case 1:
                            business = _a.sent();
                            if (!business)
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            metadata = business.metadata && typeof business.metadata === 'object'
                                ? business.metadata
                                : {};
                            return [2 /*return*/, metadata.promos || []];
                    }
                });
            });
        };
        BusinessService_1.prototype.createPromo = function (businessId, ownerId, createPromoDto) {
            return __awaiter(this, void 0, void 0, function () {
                var business, metadata, promos, newPromo;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findFirst({
                                where: { id: businessId, ownerId: ownerId },
                                select: { metadata: true },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado para este proprietário.');
                            }
                            metadata = business.metadata && typeof business.metadata === 'object'
                                ? business.metadata
                                : {};
                            promos = metadata.promos || [];
                            newPromo = __assign(__assign({ 
                                // SEGURANÇA: UUID v4 em vez de Date.now() — previne enumeração/timing attacks.
                                id: (0, crypto_1.randomUUID)() }, createPromoDto), { createdAt: new Date().toISOString() });
                            promos.push(newPromo);
                            return [4 /*yield*/, this.prisma.business.update({
                                    where: { id: businessId },
                                    data: {
                                        metadata: __assign(__assign({}, metadata), { promos: promos }),
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, newPromo];
                    }
                });
            });
        };
        BusinessService_1.prototype.updatePromo = function (promoId, ownerId, updatePromoDto) {
            return __awaiter(this, void 0, void 0, function () {
                var businesses, targetBusiness, promos, _i, businesses_1, biz, bizMetadata, bizPromos, metadata;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findMany({
                                where: { ownerId: ownerId },
                                select: { id: true, metadata: true },
                            })];
                        case 1:
                            businesses = _a.sent();
                            targetBusiness = null;
                            promos = [];
                            for (_i = 0, businesses_1 = businesses; _i < businesses_1.length; _i++) {
                                biz = businesses_1[_i];
                                bizMetadata = this.asMetadataObject(biz.metadata);
                                bizPromos = bizMetadata.promos || [];
                                if (bizPromos.find(function (p) { return p.id === promoId; })) {
                                    targetBusiness = biz;
                                    promos = bizPromos;
                                    break;
                                }
                            }
                            if (!targetBusiness) {
                                throw new common_1.NotFoundException('Promoção não encontrada para este proprietário.');
                            }
                            promos = promos.map(function (p) {
                                return p.id === promoId ? __assign(__assign(__assign({}, p), updatePromoDto), { updatedAt: new Date().toISOString() }) : p;
                            });
                            metadata = this.asMetadataObject(targetBusiness.metadata);
                            return [4 /*yield*/, this.prisma.business.update({
                                    where: { id: targetBusiness.id },
                                    data: {
                                        metadata: __assign(__assign({}, metadata), { promos: promos }),
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, promos.find(function (p) { return p.id === promoId; })];
                    }
                });
            });
        };
        BusinessService_1.prototype.deletePromo = function (promoId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var businesses, targetBusiness, promos, _i, businesses_2, biz, bizMetadata, bizPromos, metadata;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findMany({
                                where: { ownerId: ownerId },
                                select: { id: true, metadata: true },
                            })];
                        case 1:
                            businesses = _a.sent();
                            targetBusiness = null;
                            promos = [];
                            for (_i = 0, businesses_2 = businesses; _i < businesses_2.length; _i++) {
                                biz = businesses_2[_i];
                                bizMetadata = this.asMetadataObject(biz.metadata);
                                bizPromos = bizMetadata.promos || [];
                                if (bizPromos.find(function (p) { return p.id === promoId; })) {
                                    targetBusiness = biz;
                                    promos = bizPromos;
                                    break;
                                }
                            }
                            if (!targetBusiness) {
                                throw new common_1.NotFoundException('Promoção não encontrada para este proprietário.');
                            }
                            promos = promos.filter(function (p) { return p.id !== promoId; });
                            metadata = this.asMetadataObject(targetBusiness.metadata);
                            return [4 /*yield*/, this.prisma.business.update({
                                    where: { id: targetBusiness.id },
                                    data: {
                                        metadata: __assign(__assign({}, metadata), { promos: promos }),
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Promoção removida com sucesso.' }];
                    }
                });
            });
        };
        return BusinessService_1;
    }());
    __setFunctionName(_classThis, "BusinessService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BusinessService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BusinessService = _classThis;
}();
exports.BusinessService = BusinessService;
var templateObject_1;
