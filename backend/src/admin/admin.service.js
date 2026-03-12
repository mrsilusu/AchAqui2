"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var AdminService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AdminService = _classThis = /** @class */ (function () {
        function AdminService_1(prisma) {
            this.prisma = prisma;
        }
        // ─── Stats ───────────────────────────────────────────────────────────────────
        AdminService_1.prototype.getStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, totalUsers, totalBusinesses, claimedBusinesses, pendingClaims, approvedClaims, rejectedClaims, googleBusinesses;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.prisma.user.count(),
                                this.prisma.business.count(),
                                this.prisma.business.count({ where: { isClaimed: true } }),
                                this.prisma.claimRequest.count({ where: { status: 'PENDING' } }),
                                this.prisma.claimRequest.count({ where: { status: 'APPROVED' } }),
                                this.prisma.claimRequest.count({ where: { status: 'REJECTED' } }),
                                this.prisma.business.count({ where: { source: 'GOOGLE' } }),
                            ])];
                        case 1:
                            _a = _b.sent(), totalUsers = _a[0], totalBusinesses = _a[1], claimedBusinesses = _a[2], pendingClaims = _a[3], approvedClaims = _a[4], rejectedClaims = _a[5], googleBusinesses = _a[6];
                            return [2 /*return*/, {
                                    users: {
                                        total: totalUsers,
                                    },
                                    businesses: {
                                        total: totalBusinesses,
                                        claimed: claimedBusinesses,
                                        unclaimed: totalBusinesses - claimedBusinesses,
                                        claimedPercent: totalBusinesses > 0
                                            ? Math.round((claimedBusinesses / totalBusinesses) * 100)
                                            : 0,
                                        fromGoogle: googleBusinesses,
                                        manual: totalBusinesses - googleBusinesses,
                                    },
                                    claims: {
                                        pending: pendingClaims,
                                        approved: approvedClaims,
                                        rejected: rejectedClaims,
                                        total: pendingClaims + approvedClaims + rejectedClaims,
                                    },
                                }];
                    }
                });
            });
        };
        // ─── Claims Management ───────────────────────────────────────────────────────
        AdminService_1.prototype.getAllClaims = function (status) {
            return __awaiter(this, void 0, void 0, function () {
                var where;
                return __generator(this, function (_a) {
                    where = {};
                    if (status && ['PENDING', 'APPROVED', 'REJECTED'].includes(status.toUpperCase())) {
                        where.status = status.toUpperCase();
                    }
                    return [2 /*return*/, this.prisma.claimRequest.findMany({
                            where: where,
                            include: {
                                business: {
                                    select: { id: true, name: true, category: true, description: true },
                                },
                                user: {
                                    select: { id: true, name: true, email: true },
                                },
                            },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        AdminService_1.prototype.getPendingClaims = function () {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.getAllClaims('PENDING')];
                });
            });
        };
        AdminService_1.prototype.reviewClaim = function (claimId, adminId, decision, adminNote) {
            return __awaiter(this, void 0, void 0, function () {
                var claim, updatedClaim;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.claimRequest.findUnique({
                                where: { id: claimId },
                                include: { business: true },
                            })];
                        case 1:
                            claim = _a.sent();
                            if (!claim) {
                                throw new common_1.NotFoundException('Pedido de claim não encontrado.');
                            }
                            if (claim.status !== client_1.ClaimStatus.PENDING) {
                                throw new common_1.BadRequestException('Este claim já foi revisto.');
                            }
                            return [4 /*yield*/, this.prisma.claimRequest.update({
                                    where: { id: claimId },
                                    data: {
                                        status: decision,
                                        adminNote: adminNote !== null && adminNote !== void 0 ? adminNote : null,
                                        reviewedBy: adminId,
                                        reviewedAt: new Date(),
                                    },
                                    include: {
                                        business: { select: { id: true, name: true } },
                                        user: { select: { id: true, name: true, email: true } },
                                    },
                                })];
                        case 2:
                            updatedClaim = _a.sent();
                            if (!(decision === 'APPROVED')) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.business.update({
                                    where: { id: claim.businessId },
                                    data: {
                                        ownerId: claim.userId,
                                        isClaimed: true,
                                        claimedAt: new Date(),
                                    },
                                })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4: return [2 /*return*/, updatedClaim];
                    }
                });
            });
        };
        // ─── Business Management ─────────────────────────────────────────────────────
        AdminService_1.prototype.getAllBusinesses = function () {
            return __awaiter(this, arguments, void 0, function (page, limit, search) {
                var skip, where, _a, businesses, total;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            skip = (page - 1) * limit;
                            where = search
                                ? { name: { contains: search, mode: 'insensitive' } }
                                : {};
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.business.findMany({
                                        where: where,
                                        skip: skip,
                                        take: limit,
                                        include: {
                                            owner: { select: { id: true, name: true, email: true } },
                                            _count: { select: { claimRequests: true } },
                                        },
                                        orderBy: { createdAt: 'desc' },
                                    }),
                                    this.prisma.business.count({ where: where }),
                                ])];
                        case 1:
                            _a = _b.sent(), businesses = _a[0], total = _a[1];
                            return [2 /*return*/, {
                                    data: businesses,
                                    meta: { total: total, page: page, limit: limit, totalPages: Math.ceil(total / limit) },
                                }];
                    }
                });
            });
        };
        // ─── Google Places Import ─────────────────────────────────────────────────────
        AdminService_1.prototype.importFromGooglePlaces = function (query, location, apiKey) {
            return __awaiter(this, void 0, void 0, function () {
                var endpoint, response, data, imported, skipped, _i, _a, place, existing, created;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!apiKey) {
                                throw new common_1.BadRequestException('GOOGLE_PLACES_API_KEY não configurada. Adiciona ao .env do backend.');
                            }
                            endpoint = "https://maps.googleapis.com/maps/api/place/textsearch/json?query=".concat(encodeURIComponent(query + ' ' + location), "&key=").concat(apiKey);
                            return [4 /*yield*/, fetch(endpoint)];
                        case 1:
                            response = _c.sent();
                            return [4 /*yield*/, response.json()];
                        case 2:
                            data = _c.sent();
                            if (data.status !== 'OK') {
                                throw new common_1.BadRequestException("Google Places API: ".concat(data.status));
                            }
                            imported = [];
                            skipped = [];
                            _i = 0, _a = (_b = data.results) !== null && _b !== void 0 ? _b : [];
                            _c.label = 3;
                        case 3:
                            if (!(_i < _a.length)) return [3 /*break*/, 7];
                            place = _a[_i];
                            return [4 /*yield*/, this.prisma.business.findUnique({
                                    where: { googlePlaceId: place.place_id },
                                })];
                        case 4:
                            existing = _c.sent();
                            if (existing) {
                                skipped.push({ placeId: place.place_id, name: place.name });
                                return [3 /*break*/, 6];
                            }
                            return [4 /*yield*/, this.prisma.business.create({
                                    data: {
                                        name: place.name,
                                        category: 'other',
                                        description: place.formatted_address,
                                        latitude: place.geometry.location.lat,
                                        longitude: place.geometry.location.lng,
                                        source: 'GOOGLE',
                                        googlePlaceId: place.place_id,
                                        isClaimed: false,
                                        metadata: {
                                            address: place.formatted_address,
                                            rating: place.rating,
                                            userRatingsTotal: place.user_ratings_total,
                                            types: place.types,
                                        },
                                    },
                                })];
                        case 5:
                            created = _c.sent();
                            imported.push({ id: created.id, name: created.name });
                            _c.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 3];
                        case 7: return [2 /*return*/, {
                                imported: imported.length,
                                skipped: skipped.length,
                                businesses: imported,
                            }];
                    }
                });
            });
        };
        // ─── User Management ─────────────────────────────────────────────────────────
        AdminService_1.prototype.getAllUsers = function () {
            return __awaiter(this, arguments, void 0, function (page, limit) {
                var skip, _a, users, total;
                if (page === void 0) { page = 1; }
                if (limit === void 0) { limit = 20; }
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            skip = (page - 1) * limit;
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.user.findMany({
                                        skip: skip,
                                        take: limit,
                                        select: {
                                            id: true,
                                            name: true,
                                            email: true,
                                            role: true,
                                            createdAt: true,
                                            _count: { select: { businesses: true, claimRequests: true } },
                                        },
                                        orderBy: { createdAt: 'desc' },
                                    }),
                                    this.prisma.user.count(),
                                ])];
                        case 1:
                            _a = _b.sent(), users = _a[0], total = _a[1];
                            return [2 /*return*/, {
                                    data: users,
                                    meta: { total: total, page: page, limit: limit, totalPages: Math.ceil(total / limit) },
                                }];
                    }
                });
            });
        };
        // ─── Report Business (owner requests admin to add it) ────────────────────────
        AdminService_1.prototype.reportMissingBusiness = function (userId, note, businessName) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    // Store as a notification for admin — we use the notifications table
                    return [2 /*return*/, this.prisma.notification.create({
                            data: {
                                userId: userId,
                                title: '📍 Negócio em falta reportado',
                                message: "Um dono reportou um neg\u00F3cio em falta".concat(businessName ? ": \"".concat(businessName, "\"") : '', ". Nota: ").concat(note),
                                data: { type: 'MISSING_BUSINESS', reportedBy: userId, businessName: businessName, note: note },
                                isRead: false,
                            },
                        })];
                });
            });
        };
        return AdminService_1;
    }());
    __setFunctionName(_classThis, "AdminService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdminService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdminService = _classThis;
}();
exports.AdminService = AdminService;
