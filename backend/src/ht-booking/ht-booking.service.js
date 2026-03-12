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
exports.HtBookingService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
// [TENANT] Todas as queries incluem businessId extraído do JWT.
// [ACID]   check-in e check-out usam transação Prisma ($transaction).
// [AUDIT]  Cada mutação regista uma linha em core_audit_logs.
var HtBookingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HtBookingService = _classThis = /** @class */ (function () {
        function HtBookingService_1(prisma, eventsGateway) {
            this.prisma = prisma;
            this.eventsGateway = eventsGateway;
        }
        // [TENANT] Valida que a reserva pertence ao negócio do owner autenticado.
        // Previne IDOR: Owner A não acede a reservas de Owner B.
        HtBookingService_1.prototype.findBookingForOwner = function (bookingId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.htRoomBooking.findFirst({
                                where: { id: bookingId }, // Roles guard garante que só OWNERs chegam aqui
                                include: {
                                    room: true,
                                    roomType: { select: { name: true } },
                                    user: { select: { id: true, name: true, email: true } },
                                    business: { select: { id: true, name: true, ownerId: true } },
                                },
                            })];
                        case 1:
                            booking = _a.sent();
                            if (!booking)
                                throw new common_1.NotFoundException('Reserva não encontrada.');
                            return [2 /*return*/, booking];
                    }
                });
            });
        };
        // [AUDIT] Linha imutável no log central — nunca dados pessoais em previousData/newData.
        HtBookingService_1.prototype.audit = function (params) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.prisma.coreAuditLog.create({
                                data: {
                                    businessId: params.businessId,
                                    module: 'HT',
                                    action: params.action,
                                    actorId: params.actorId,
                                    resourceType: 'HtRoomBooking',
                                    resourceId: params.resourceId,
                                    previousData: (_a = params.previousData) !== null && _a !== void 0 ? _a : {},
                                    newData: (_b = params.newData) !== null && _b !== void 0 ? _b : {},
                                    note: params.note,
                                    ipAddress: params.ipAddress,
                                },
                            })];
                        case 1:
                            _c.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        // CHECK-IN
        // [ACID] Transação atómica: atualiza reserva + atribui quarto.
        HtBookingService_1.prototype.checkIn = function (bookingId, ownerId, dto, ip) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, room, previousStatus, updated;
                var _this = this;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.findBookingForOwner(bookingId, ownerId)];
                        case 1:
                            booking = _b.sent();
                            if (booking.status !== client_1.HtBookingStatus.CONFIRMED && booking.status !== client_1.HtBookingStatus.PENDING) {
                                throw new common_1.BadRequestException("N\u00E3o \u00E9 poss\u00EDvel fazer check-in. Estado actual: ".concat(booking.status));
                            }
                            if (!dto.roomId) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.htRoom.findFirst({
                                    where: { id: dto.roomId, businessId: booking.businessId },
                                })];
                        case 2:
                            room = _b.sent();
                            if (!room)
                                throw new common_1.BadRequestException('Quarto não encontrado neste estabelecimento.');
                            if (room.status === 'DIRTY' || room.status === 'MAINTENANCE') {
                                throw new common_1.BadRequestException("Quarto ".concat(room.number, " n\u00E3o est\u00E1 dispon\u00EDvel (").concat(room.status, ")."));
                            }
                            _b.label = 3;
                        case 3:
                            previousStatus = booking.status;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var updatedBooking;
                                    var _a, _b, _c;
                                    return __generator(this, function (_d) {
                                        switch (_d.label) {
                                            case 0: return [4 /*yield*/, tx.htRoomBooking.update({
                                                    where: { id: bookingId },
                                                    data: {
                                                        status: client_1.HtBookingStatus.CHECKED_IN,
                                                        checkedInAt: new Date(),
                                                        roomId: (_a = dto.roomId) !== null && _a !== void 0 ? _a : booking.roomId,
                                                        guestName: (_b = dto.guestName) !== null && _b !== void 0 ? _b : booking.guestName,
                                                        guestPhone: (_c = dto.guestPhone) !== null && _c !== void 0 ? _c : booking.guestPhone,
                                                        version: { increment: 1 },
                                                    },
                                                    include: {
                                                        room: { select: { number: true } },
                                                        roomType: { select: { name: true } },
                                                        user: { select: { id: true, name: true } },
                                                        business: { select: { id: true, name: true } },
                                                    },
                                                })];
                                            case 1:
                                                updatedBooking = _d.sent();
                                                if (!dto.roomId) return [3 /*break*/, 3];
                                                return [4 /*yield*/, tx.htRoom.update({
                                                        where: { id: dto.roomId },
                                                        data: { status: 'CLEAN', version: { increment: 1 } },
                                                    })];
                                            case 2:
                                                _d.sent();
                                                _d.label = 3;
                                            case 3: return [2 /*return*/, updatedBooking];
                                        }
                                    });
                                }); })];
                        case 4:
                            updated = _b.sent();
                            return [4 /*yield*/, this.audit({
                                    businessId: booking.businessId,
                                    action: 'HT_BOOKING_CHECKED_IN',
                                    actorId: ownerId,
                                    resourceId: bookingId,
                                    previousData: { status: previousStatus },
                                    newData: { status: client_1.HtBookingStatus.CHECKED_IN, roomId: updated.roomId, checkedInAt: updated.checkedInAt },
                                    ipAddress: ip,
                                })];
                        case 5:
                            _b.sent();
                            this.eventsGateway.emitToUser(booking.user.id, 'booking.checkedIn', {
                                bookingId: bookingId,
                                businessName: booking.business.name,
                                roomNumber: (_a = updated.room) === null || _a === void 0 ? void 0 : _a.number,
                                checkedInAt: updated.checkedInAt,
                            });
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        // CHECK-OUT
        // [ACID] Transação: reserva CHECKED_OUT + quarto DIRTY + HousekeepingTask criada.
        HtBookingService_1.prototype.checkOut = function (bookingId, ownerId, ip) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, previousStatus, updated;
                var _this = this;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.findBookingForOwner(bookingId, ownerId)];
                        case 1:
                            booking = _c.sent();
                            if (booking.status !== client_1.HtBookingStatus.CHECKED_IN) {
                                throw new common_1.BadRequestException("N\u00E3o \u00E9 poss\u00EDvel fazer check-out. Estado actual: ".concat(booking.status));
                            }
                            previousStatus = booking.status;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var updatedBooking;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.htRoomBooking.update({
                                                    where: { id: bookingId },
                                                    data: {
                                                        status: client_1.HtBookingStatus.CHECKED_OUT,
                                                        checkedOutAt: new Date(),
                                                        version: { increment: 1 },
                                                    },
                                                    include: {
                                                        room: { select: { id: true, number: true } },
                                                        business: { select: { id: true, name: true } },
                                                        user: { select: { id: true, name: true } },
                                                    },
                                                })];
                                            case 1:
                                                updatedBooking = _a.sent();
                                                if (!updatedBooking.roomId) return [3 /*break*/, 4];
                                                return [4 /*yield*/, tx.htRoom.update({
                                                        where: { id: updatedBooking.roomId },
                                                        data: { status: 'DIRTY', version: { increment: 1 } },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                return [4 /*yield*/, tx.htHousekeepingTask.create({
                                                        data: { roomId: updatedBooking.roomId, priority: 'NORMAL' },
                                                    })];
                                            case 3:
                                                _a.sent();
                                                _a.label = 4;
                                            case 4: return [2 /*return*/, updatedBooking];
                                        }
                                    });
                                }); })];
                        case 2:
                            updated = _c.sent();
                            return [4 /*yield*/, this.audit({
                                    businessId: booking.businessId,
                                    action: 'HT_BOOKING_CHECKED_OUT',
                                    actorId: ownerId,
                                    resourceId: bookingId,
                                    previousData: { status: previousStatus },
                                    newData: { status: client_1.HtBookingStatus.CHECKED_OUT, checkedOutAt: updated.checkedOutAt },
                                    ipAddress: ip,
                                })];
                        case 3:
                            _c.sent();
                            this.eventsGateway.emitToUser(ownerId, 'room.dirty', {
                                bookingId: bookingId,
                                roomId: (_a = updated.room) === null || _a === void 0 ? void 0 : _a.id,
                                roomNumber: (_b = updated.room) === null || _b === void 0 ? void 0 : _b.number,
                            });
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        // NO-SHOW — liberta quarto se atribuído.
        HtBookingService_1.prototype.markNoShow = function (bookingId, ownerId, ip) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, previousStatus, updated;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.findBookingForOwner(bookingId, ownerId)];
                        case 1:
                            booking = _a.sent();
                            if (booking.status !== client_1.HtBookingStatus.CONFIRMED && booking.status !== client_1.HtBookingStatus.PENDING) {
                                throw new common_1.BadRequestException("Estado inv\u00E1lido para No-Show: ".concat(booking.status));
                            }
                            previousStatus = booking.status;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var updatedBooking;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.htRoomBooking.update({
                                                    where: { id: bookingId },
                                                    data: { status: client_1.HtBookingStatus.NO_SHOW, noShowAt: new Date(), version: { increment: 1 } },
                                                })];
                                            case 1:
                                                updatedBooking = _a.sent();
                                                if (!booking.roomId) return [3 /*break*/, 3];
                                                return [4 /*yield*/, tx.htRoom.update({
                                                        where: { id: booking.roomId },
                                                        data: { status: 'CLEAN', version: { increment: 1 } },
                                                    })];
                                            case 2:
                                                _a.sent();
                                                _a.label = 3;
                                            case 3: return [2 /*return*/, updatedBooking];
                                        }
                                    });
                                }); })];
                        case 2:
                            updated = _a.sent();
                            return [4 /*yield*/, this.audit({
                                    businessId: booking.businessId,
                                    action: 'HT_BOOKING_NO_SHOW',
                                    actorId: ownerId,
                                    resourceId: bookingId,
                                    previousData: { status: previousStatus },
                                    newData: { status: client_1.HtBookingStatus.NO_SHOW, noShowAt: updated.noShowAt },
                                    ipAddress: ip,
                                })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, updated];
                    }
                });
            });
        };
        // CHEGADAS — próximos 7 dias (PENDING ou CONFIRMED). Se não houver hoje, mostra as próximas.
        // [TENANT] [GDPR] — não expõe dados sensíveis do hóspede.
        HtBookingService_1.prototype.getTodayArrivals = function (businessId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, start, end7;
                return __generator(this, function (_a) {
                    now = new Date();
                    start = new Date(now);
                    start.setHours(0, 0, 0, 0);
                    end7 = new Date(now);
                    end7.setDate(end7.getDate() + 7);
                    end7.setHours(23, 59, 59, 999);
                    return [2 /*return*/, this.prisma.htRoomBooking.findMany({
                            where: {
                                businessId: businessId,
                                startDate: { gte: start, lte: end7 },
                                status: { in: [client_1.HtBookingStatus.PENDING, client_1.HtBookingStatus.CONFIRMED] },
                            },
                            select: BOOKING_SELECT,
                            orderBy: { startDate: 'asc' },
                        })];
                });
            });
        };
        // SAÍDAS — próximos 7 dias com status CHECKED_IN.
        HtBookingService_1.prototype.getTodayDepartures = function (businessId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, start, end7;
                return __generator(this, function (_a) {
                    now = new Date();
                    start = new Date(now);
                    start.setHours(0, 0, 0, 0);
                    end7 = new Date(now);
                    end7.setDate(end7.getDate() + 7);
                    end7.setHours(23, 59, 59, 999);
                    return [2 /*return*/, this.prisma.htRoomBooking.findMany({
                            where: {
                                businessId: businessId,
                                endDate: { gte: start, lte: end7 },
                                status: client_1.HtBookingStatus.CHECKED_IN,
                            },
                            select: BOOKING_SELECT,
                            orderBy: { endDate: 'asc' },
                        })];
                });
            });
        };
        // HÓSPEDES ACTUAIS — todos com status CHECKED_IN.
        HtBookingService_1.prototype.getCurrentGuests = function (businessId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.htRoomBooking.findMany({
                            where: { businessId: businessId, status: client_1.HtBookingStatus.CHECKED_IN },
                            select: BOOKING_SELECT,
                            orderBy: { checkedInAt: 'asc' },
                        })];
                });
            });
        };
        // [TENANT] Verifica que o owner é dono do negócio sem carregar reservas.
        HtBookingService_1.prototype.assertOwnership = function (businessId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var b;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findFirst({ where: { id: businessId, ownerId: ownerId } })];
                        case 1:
                            b = _a.sent();
                            if (!b)
                                throw new common_1.ForbiddenException('Sem permissão para este estabelecimento.');
                            return [2 /*return*/];
                    }
                });
            });
        };
        return HtBookingService_1;
    }());
    __setFunctionName(_classThis, "HtBookingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HtBookingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HtBookingService = _classThis;
}();
exports.HtBookingService = HtBookingService;
// ── Helpers ──────────────────────────────────────────────────────────────────
function todayRange() {
    var now = new Date();
    var start = new Date(now);
    start.setHours(0, 0, 0, 0);
    var end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start: start, end: end };
}
var BOOKING_SELECT = {
    id: true, guestName: true, guestPhone: true,
    adults: true, children: true, rooms: true,
    startDate: true, endDate: true, status: true,
    notes: true, checkedInAt: true, checkedOutAt: true,
    totalPrice: true, paymentStatus: true, roomTypeId: true,
    roomType: { select: { name: true, pricePerNight: true } },
    room: { select: { number: true, floor: true } },
    user: { select: { id: true, name: true } },
};
