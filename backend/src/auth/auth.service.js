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
exports.AuthService = void 0;
var common_1 = require("@nestjs/common");
var bcrypt = require("bcrypt");
var crypto_1 = require("crypto");
var client_1 = require("@prisma/client");
var AuthService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AuthService = _classThis = /** @class */ (function () {
        function AuthService_1(prisma, jwtService) {
            this.prisma = prisma;
            this.jwtService = jwtService;
            this.refreshTokenExpiresIn = '7d';
        }
        AuthService_1.prototype.hashToken = function (token) {
            return (0, crypto_1.createHash)('sha256').update(token).digest('hex');
        };
        AuthService_1.prototype.createAccessToken = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                return __generator(this, function (_b) {
                    return [2 /*return*/, this.jwtService.signAsync({
                            sub: user.id,
                            email: user.email,
                            role: user.role,
                        }, {
                            secret: (_a = process.env.JWT_SECRET) !== null && _a !== void 0 ? _a : 'dev-secret-change-me',
                            expiresIn: '1d',
                        })];
                });
            });
        };
        AuthService_1.prototype.createRefreshToken = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var tokenId, refreshToken, expiresAt;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            tokenId = (0, crypto_1.randomUUID)();
                            return [4 /*yield*/, this.jwtService.signAsync({
                                    sub: user.id,
                                    tokenId: tokenId,
                                    type: 'refresh',
                                }, {
                                    secret: (_a = process.env.JWT_REFRESH_SECRET) !== null && _a !== void 0 ? _a : 'dev-refresh-secret-change-me',
                                    expiresIn: this.refreshTokenExpiresIn,
                                })];
                        case 1:
                            refreshToken = _b.sent();
                            expiresAt = new Date();
                            expiresAt.setDate(expiresAt.getDate() + 7);
                            return [4 /*yield*/, this.prisma.refreshToken.create({
                                    data: {
                                        tokenId: tokenId,
                                        tokenHash: this.hashToken(refreshToken),
                                        userId: user.id,
                                        expiresAt: expiresAt,
                                    },
                                })];
                        case 2:
                            _b.sent();
                            return [2 /*return*/, refreshToken];
                    }
                });
            });
        };
        AuthService_1.prototype.buildAuthResponse = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var accessToken, refreshToken;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.createAccessToken(user)];
                        case 1:
                            accessToken = _a.sent();
                            return [4 /*yield*/, this.createRefreshToken(user)];
                        case 2:
                            refreshToken = _a.sent();
                            return [2 /*return*/, {
                                    accessToken: accessToken,
                                    refreshToken: refreshToken,
                                    user: {
                                        id: user.id,
                                        email: user.email,
                                        name: user.name,
                                        role: user.role,
                                    },
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.signUp = function (signUpDto) {
            return __awaiter(this, void 0, void 0, function () {
                var existingUser, hashedPassword, user;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { email: signUpDto.email },
                            })];
                        case 1:
                            existingUser = _b.sent();
                            if (existingUser) {
                                throw new common_1.ConflictException('Email já está em uso.');
                            }
                            return [4 /*yield*/, bcrypt.hash(signUpDto.password, 10)];
                        case 2:
                            hashedPassword = _b.sent();
                            return [4 /*yield*/, this.prisma.user.create({
                                    data: {
                                        email: signUpDto.email,
                                        password: hashedPassword,
                                        name: signUpDto.name,
                                        role: (_a = signUpDto.role) !== null && _a !== void 0 ? _a : client_1.UserRole.CLIENT,
                                    },
                                })];
                        case 3:
                            user = _b.sent();
                            return [2 /*return*/, this.buildAuthResponse(user)];
                    }
                });
            });
        };
        AuthService_1.prototype.signIn = function (signInDto) {
            return __awaiter(this, void 0, void 0, function () {
                var user, isPasswordValid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { email: signInDto.email },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('Credenciais inválidas.');
                            }
                            return [4 /*yield*/, bcrypt.compare(signInDto.password, user.password)];
                        case 2:
                            isPasswordValid = _a.sent();
                            if (!isPasswordValid) {
                                throw new common_1.UnauthorizedException('Credenciais inválidas.');
                            }
                            return [2 /*return*/, this.buildAuthResponse(user)];
                    }
                });
            });
        };
        AuthService_1.prototype.refresh = function (refreshTokenDto) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, _a, storedToken, user;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
                                    secret: (_b = process.env.JWT_REFRESH_SECRET) !== null && _b !== void 0 ? _b : 'dev-refresh-secret-change-me',
                                })];
                        case 1:
                            payload = _c.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = _c.sent();
                            throw new common_1.UnauthorizedException('Refresh token inválido.');
                        case 3:
                            if (payload.type !== 'refresh') {
                                throw new common_1.UnauthorizedException('Tipo de token inválido.');
                            }
                            return [4 /*yield*/, this.prisma.refreshToken.findUnique({
                                    where: { tokenId: payload.tokenId },
                                })];
                        case 4:
                            storedToken = _c.sent();
                            if (!storedToken ||
                                storedToken.userId !== payload.sub ||
                                storedToken.revokedAt ||
                                storedToken.expiresAt < new Date() ||
                                storedToken.tokenHash !== this.hashToken(refreshTokenDto.refreshToken)) {
                                throw new common_1.UnauthorizedException('Refresh token inválido ou revogado.');
                            }
                            return [4 /*yield*/, this.prisma.refreshToken.update({
                                    where: { tokenId: payload.tokenId },
                                    data: { revokedAt: new Date() },
                                })];
                        case 5:
                            _c.sent();
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: payload.sub },
                                })];
                        case 6:
                            user = _c.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('Utilizador não encontrado.');
                            }
                            return [2 /*return*/, this.buildAuthResponse(user)];
                    }
                });
            });
        };
        AuthService_1.prototype.logout = function (refreshTokenDto) {
            return __awaiter(this, void 0, void 0, function () {
                var payload, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            _c.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, this.jwtService.verifyAsync(refreshTokenDto.refreshToken, {
                                    secret: (_b = process.env.JWT_REFRESH_SECRET) !== null && _b !== void 0 ? _b : 'dev-refresh-secret-change-me',
                                })];
                        case 1:
                            payload = _c.sent();
                            return [3 /*break*/, 3];
                        case 2:
                            _a = _c.sent();
                            return [2 /*return*/, { message: 'Sessão invalidada.' }];
                        case 3: return [4 /*yield*/, this.prisma.refreshToken.updateMany({
                                where: {
                                    tokenId: payload.tokenId,
                                    revokedAt: null,
                                },
                                data: {
                                    revokedAt: new Date(),
                                },
                            })];
                        case 4:
                            _c.sent();
                            return [2 /*return*/, { message: 'Sessão invalidada.' }];
                    }
                });
            });
        };
        AuthService_1.prototype.me = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                                select: {
                                    id: true,
                                    email: true,
                                    name: true,
                                    role: true,
                                    createdAt: true,
                                    _count: {
                                        select: {
                                            htBookings: true,
                                            notifications: true,
                                            businesses: true,
                                        },
                                    },
                                },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('Utilizador não encontrado.');
                            }
                            return [2 /*return*/, {
                                    id: user.id,
                                    email: user.email,
                                    name: user.name,
                                    role: user.role,
                                    createdAt: user.createdAt,
                                    stats: {
                                        bookings: user._count.htBookings,
                                        notifications: user._count.notifications,
                                        businesses: user._count.businesses,
                                    },
                                }];
                    }
                });
            });
        };
        AuthService_1.prototype.updateSettings = function (userId, settingsDto) {
            return __awaiter(this, void 0, void 0, function () {
                var user;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.user.findUnique({
                                where: { id: userId },
                                select: { id: true },
                            })];
                        case 1:
                            user = _a.sent();
                            if (!user) {
                                throw new common_1.UnauthorizedException('Utilizador não encontrado.');
                            }
                            // Store settings in a simple way (could be extended with a settings table)
                            // For now, we'll just acknowledge the settings were received
                            // In production, you might store these in a separate table or in user metadata
                            return [2 /*return*/, {
                                    id: user.id,
                                    message: 'Configurações actualizadas com sucesso.',
                                    settings: settingsDto,
                                }];
                    }
                });
            });
        };
        return AuthService_1;
    }());
    __setFunctionName(_classThis, "AuthService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AuthService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AuthService = _classThis;
}();
exports.AuthService = AuthService;
