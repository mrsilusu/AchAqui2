"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var create_booking_dto_1 = require("./dto/create-booking.dto");
var BookingService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var BookingService = _classThis = /** @class */ (function () {
        function BookingService_1(prisma, eventsGateway, mailService) {
            this.prisma = prisma;
            this.eventsGateway = eventsGateway;
            this.mailService = mailService;
        }
        BookingService_1.prototype.normalizeBookings = function (items, bookingType) {
            return items.map(function (item) { return (__assign(__assign({}, item), { bookingType: bookingType })); });
        };
        BookingService_1.prototype.sortByCreatedAtDesc = function (items) {
            return __spreadArray([], items, true).sort(function (a, b) {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        };
        BookingService_1.prototype.findOwnedBooking = function (bookingId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var include, tableBookingRaw, tableUser, tableBooking, roomBooking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            include = {
                                business: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                    },
                                },
                            };
                            return [4 /*yield*/, this.prisma.diTableBooking.findFirst({
                                    where: {
                                        id: bookingId,
                                        business: { ownerId: ownerId },
                                    },
                                    include: { business: { select: { id: true, name: true } } },
                                })];
                        case 1:
                            tableBookingRaw = _a.sent();
                            if (!tableBookingRaw) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: tableBookingRaw.userId },
                                    select: { id: true, name: true },
                                })];
                        case 2:
                            tableUser = _a.sent();
                            tableBooking = __assign(__assign({}, tableBookingRaw), { user: tableUser !== null && tableUser !== void 0 ? tableUser : { id: tableBookingRaw.userId, name: '' } });
                            return [2 /*return*/, { booking: tableBooking, bookingType: create_booking_dto_1.BookingTypeDto.TABLE }];
                        case 3: return [4 /*yield*/, this.prisma.htRoomBooking.findFirst({
                                where: {
                                    id: bookingId,
                                    business: {
                                        ownerId: ownerId,
                                    },
                                },
                                include: include,
                            })];
                        case 4:
                            roomBooking = _a.sent();
                            if (roomBooking) {
                                return [2 /*return*/, { booking: roomBooking, bookingType: create_booking_dto_1.BookingTypeDto.ROOM }];
                            }
                            return [2 /*return*/, null];
                    }
                });
            });
        };
        BookingService_1.prototype.findAllForUser = function (userId, role) {
            return __awaiter(this, void 0, void 0, function () {
                var htInclude, diInclude, _a, tableBookings_1, roomBookings_1, _b, tableBookings, roomBookings;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            htInclude = {
                                business: { select: { id: true, name: true } },
                                user: { select: { id: true, name: true, email: true } },
                            };
                            diInclude = {
                                business: { select: { id: true, name: true } },
                            };
                            if (!(role === client_1.UserRole.OWNER)) return [3 /*break*/, 2];
                            return [4 /*yield*/, Promise.all([
                                    this.prisma.diTableBooking.findMany({
                                        where: { business: { ownerId: userId } },
                                        include: diInclude,
                                        orderBy: { createdAt: 'desc' },
                                    }),
                                    this.prisma.htRoomBooking.findMany({
                                        where: { business: { ownerId: userId } },
                                        include: htInclude,
                                        orderBy: { createdAt: 'desc' },
                                    }),
                                ])];
                        case 1:
                            _a = _c.sent(), tableBookings_1 = _a[0], roomBookings_1 = _a[1];
                            return [2 /*return*/, this.sortByCreatedAtDesc(__spreadArray(__spreadArray([], this.normalizeBookings(tableBookings_1, create_booking_dto_1.BookingTypeDto.TABLE), true), this.normalizeBookings(roomBookings_1, create_booking_dto_1.BookingTypeDto.ROOM), true))];
                        case 2: return [4 /*yield*/, Promise.all([
                                this.prisma.diTableBooking.findMany({
                                    where: { userId: userId },
                                    include: diInclude,
                                    orderBy: { createdAt: 'desc' },
                                }),
                                this.prisma.htRoomBooking.findMany({
                                    where: { userId: userId },
                                    include: { business: { select: { id: true, name: true } } },
                                    orderBy: { createdAt: 'desc' },
                                }),
                            ])];
                        case 3:
                            _b = _c.sent(), tableBookings = _b[0], roomBookings = _b[1];
                            return [2 /*return*/, this.sortByCreatedAtDesc(__spreadArray(__spreadArray([], this.normalizeBookings(tableBookings, create_booking_dto_1.BookingTypeDto.TABLE), true), this.normalizeBookings(roomBookings, create_booking_dto_1.BookingTypeDto.ROOM), true))];
                    }
                });
            });
        };
        BookingService_1.prototype.create = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var startDate, endDate, business, user, bookingType, bookingData, roomBookingData, booking, _a, guestLabel, ownerNotification;
                var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
                return __generator(this, function (_o) {
                    switch (_o.label) {
                        case 0:
                            startDate = new Date(dto.startDate);
                            endDate = new Date(dto.endDate);
                            if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
                                throw new common_1.BadRequestException('Datas inválidas para reserva.');
                            }
                            if (startDate >= endDate) {
                                throw new common_1.BadRequestException('startDate deve ser menor que endDate.');
                            }
                            return [4 /*yield*/, this.prisma.business.findUnique({
                                    where: { id: dto.businessId },
                                    include: {
                                        owner: {
                                            select: {
                                                id: true,
                                                email: true,
                                                name: true,
                                            },
                                        },
                                    },
                                })];
                        case 1:
                            business = _o.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            }
                            return [4 /*yield*/, this.prisma.user.findUnique({
                                    where: { id: userId },
                                    select: {
                                        id: true,
                                        email: true,
                                        name: true,
                                    },
                                })];
                        case 2:
                            user = _o.sent();
                            if (!user) {
                                throw new common_1.NotFoundException('Utilizador não encontrado.');
                            }
                            bookingType = (_b = dto.bookingType) !== null && _b !== void 0 ? _b : create_booking_dto_1.BookingTypeDto.TABLE;
                            bookingData = {
                                startDate: startDate,
                                endDate: endDate,
                                status: (_c = dto.status) !== null && _c !== void 0 ? _c : client_1.HtBookingStatus.PENDING,
                                userId: userId,
                                businessId: dto.businessId,
                            };
                            var calculatedPrice = (_j = dto.totalPrice) !== null && _j !== void 0 ? _j : null;
                            if (!calculatedPrice && dto.roomTypeId) {
                                var roomType = await this.prisma.htRoomType.findUnique({ where: { id: dto.roomTypeId }, select: { pricePerNight: true } });
                                if (roomType && roomType.pricePerNight) {
                                    var nights = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                                    var qty = (_h = dto.rooms) !== null && _h !== void 0 ? _h : 1;
                                    calculatedPrice = roomType.pricePerNight * nights * qty;
                                }
                            }
                            roomBookingData = __assign(__assign({}, bookingData), { guestName: (_d = dto.guestName) !== null && _d !== void 0 ? _d : user.name, guestPhone: (_e = dto.guestPhone) !== null && _e !== void 0 ? _e : null, adults: (_f = dto.adults) !== null && _f !== void 0 ? _f : 1, children: (_g = dto.children) !== null && _g !== void 0 ? _g : 0, rooms: (_h = dto.rooms) !== null && _h !== void 0 ? _h : 1, totalPrice: calculatedPrice, notes: (_k = dto.notes) !== null && _k !== void 0 ? _k : null, roomTypeId: (_l = dto.roomTypeId) !== null && _l !== void 0 ? _l : null });
                            if (!(bookingType === create_booking_dto_1.BookingTypeDto.ROOM)) return [3 /*break*/, 4];
                            // Validar disponibilidade antes de criar reserva
                            if (dto.roomTypeId) {
                                // Regra 1+2: contar quartos físicos e reservas activas sobrepostas
                                var physicalRooms = await this.prisma.htRoom.count({
                                    where: { roomTypeId: dto.roomTypeId, businessId: dto.businessId }
                                });
                                if (physicalRooms === 0) {
                                    throw new common_1.BadRequestException('Este tipo de quarto não tem quartos físicos disponíveis.');
                                }
                                // Regra 2: contar reservas activas sobrepostas para este roomType
                                var overlapping = await this.prisma.htRoomBooking.count({
                                    where: {
                                        roomTypeId: dto.roomTypeId,
                                        status: { in: [client_1.HtBookingStatus.PENDING, client_1.HtBookingStatus.CONFIRMED, client_1.HtBookingStatus.CHECKED_IN] },
                                        startDate: { lt: endDate },
                                        endDate:   { gt: startDate },
                                    }
                                });
                                if (overlapping >= physicalRooms) {
                                    throw new common_1.BadRequestException('Não há quartos disponíveis para as datas seleccionadas.');
                                }
                            }
                            return [4 /*yield*/, this.prisma.htRoomBooking.create({
                                    data: roomBookingData,
                                    include: {
                                        business: {
                                            select: {
                                                id: true,
                                                name: true,
                                                ownerId: true,
                                            },
                                        },
                                    },
                                })];
                        case 3:
                            _a = _o.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.prisma.diTableBooking.create({
                                data: bookingData,
                                include: {
                                    business: {
                                        select: {
                                            id: true,
                                            name: true,
                                            ownerId: true,
                                        },
                                    },
                                },
                            })];
                        case 5:
                            _a = _o.sent();
                            _o.label = 6;
                        case 6:
                            booking = _a;
                            guestLabel = (_m = dto.guestName) !== null && _m !== void 0 ? _m : user.name;
                            return [4 /*yield*/, this.prisma.notification.create({
                                    data: {
                                        userId: business.owner.id,
                                        title: '🛎️ Nova Reserva Recebida',
                                        message: "".concat(guestLabel, " criou uma nova reserva em ").concat(business.name, "."),
                                        data: {
                                            bookingId: booking.id,
                                            bookingType: bookingType,
                                            businessId: business.id,
                                            startDate: startDate,
                                            endDate: endDate,
                                        },
                                    },
                                })];
                        case 7:
                            ownerNotification = _o.sent();
                            return [4 /*yield*/, this.prisma.notification.create({
                                    data: {
                                        userId: user.id,
                                        title: 'Reserva Criada',
                                        message: "A tua reserva em ".concat(business.name, " foi criada com sucesso."),
                                        data: {
                                            bookingId: booking.id,
                                            bookingType: bookingType,
                                            businessId: business.id,
                                            startDate: startDate,
                                            endDate: endDate,
                                        },
                                    },
                                })];
                        case 8:
                            _o.sent();
                            this.eventsGateway.emitToUser(business.owner.id, 'booking.created', {
                                notificationId: ownerNotification.id,
                                bookingId: booking.id,
                                bookingType: bookingType,
                                businessId: business.id,
                                businessName: business.name,
                                customerName: user.name,
                                startDate: booking.startDate,
                                endDate: booking.endDate,
                                status: booking.status,
                            });
                            void this.mailService.sendNewBookingEmail({
                                ownerEmail: business.owner.email,
                                clientEmail: user.email,
                                businessName: business.name,
                                startDate: booking.startDate,
                                endDate: booking.endDate,
                            });
                            return [2 /*return*/, __assign(__assign({}, booking), { bookingType: bookingType })];
                    }
                });
            });
        };
        BookingService_1.prototype.confirmByOwner = function (bookingId, ownerId, businessId) {
            return __awaiter(this, void 0, void 0, function () {
                var found, booking, bookingType, updatedBooking, _a, _b, clientNotification;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0: return [4 /*yield*/, this.findOwnedBooking(bookingId, ownerId)];
                        case 1:
                            found = _c.sent();
                            if (!found) {
                                throw new common_1.NotFoundException('Reserva não encontrada para este proprietário.');
                            }
                            booking = found.booking, bookingType = found.bookingType;
                            if (businessId && booking.business.id !== businessId) {
                                throw new common_1.BadRequestException('Reserva não pertence ao businessId informado.');
                            }
                            if (booking.status === client_1.HtBookingStatus.CANCELLED) {
                                throw new common_1.BadRequestException('Não é possível confirmar uma reserva cancelada.');
                            }
                            if (!(booking.status === client_1.HtBookingStatus.CONFIRMED)) return [3 /*break*/, 2];
                            _a = booking;
                            return [3 /*break*/, 7];
                        case 2:
                            if (!(bookingType === create_booking_dto_1.BookingTypeDto.ROOM)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.htRoomBooking.update({
                                    where: { id: booking.id },
                                    data: { status: client_1.HtBookingStatus.CONFIRMED },
                                })];
                        case 3:
                            _b = _c.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.prisma.diTableBooking.update({
                                where: { id: booking.id },
                                data: { status: client_1.HtBookingStatus.CONFIRMED },
                            })];
                        case 5:
                            _b = _c.sent();
                            _c.label = 6;
                        case 6:
                            _a = _b;
                            _c.label = 7;
                        case 7:
                            updatedBooking = _a;
                            return [4 /*yield*/, this.prisma.notification.create({
                                    data: {
                                        userId: booking.user.id,
                                        title: 'Reserva Confirmada',
                                        message: "A tua reserva em ".concat(booking.business.name, " foi confirmada."),
                                        data: {
                                            bookingId: booking.id,
                                            bookingType: bookingType,
                                            businessId: booking.business.id,
                                            status: client_1.HtBookingStatus.CONFIRMED,
                                        },
                                    },
                                })];
                        case 8:
                            clientNotification = _c.sent();
                            this.eventsGateway.emitToUser(booking.user.id, 'booking.confirmed', {
                                notificationId: clientNotification.id,
                                bookingId: booking.id,
                                bookingType: bookingType,
                                businessId: booking.business.id,
                                status: client_1.HtBookingStatus.CONFIRMED,
                            });
                            return [2 /*return*/, __assign(__assign({}, updatedBooking), { bookingType: bookingType })];
                    }
                });
            });
        };
        BookingService_1.prototype.rejectByOwner = function (bookingId, ownerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var found, booking, bookingType, reason, updatedBooking, _a, _b, clientNotification;
                var _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.findOwnedBooking(bookingId, ownerId)];
                        case 1:
                            found = _d.sent();
                            if (!found) {
                                throw new common_1.NotFoundException('Reserva não encontrada para este proprietário.');
                            }
                            booking = found.booking, bookingType = found.bookingType;
                            if (dto.businessId && booking.business.id !== dto.businessId) {
                                throw new common_1.BadRequestException('Reserva não pertence ao businessId informado.');
                            }
                            reason = (_c = dto.reason) === null || _c === void 0 ? void 0 : _c.trim();
                            if (!(booking.status === client_1.HtBookingStatus.CANCELLED)) return [3 /*break*/, 2];
                            _a = booking;
                            return [3 /*break*/, 7];
                        case 2:
                            if (!(bookingType === create_booking_dto_1.BookingTypeDto.ROOM)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.prisma.htRoomBooking.update({
                                    where: { id: booking.id },
                                    data: { status: client_1.HtBookingStatus.CANCELLED },
                                })];
                        case 3:
                            _b = _d.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.prisma.diTableBooking.update({
                                where: { id: booking.id },
                                data: { status: client_1.HtBookingStatus.CANCELLED },
                            })];
                        case 5:
                            _b = _d.sent();
                            _d.label = 6;
                        case 6:
                            _a = _b;
                            _d.label = 7;
                        case 7:
                            updatedBooking = _a;
                            return [4 /*yield*/, this.prisma.notification.create({
                                    data: {
                                        userId: booking.user.id,
                                        title: 'Reserva Recusada',
                                        message: reason
                                            ? "A tua reserva em ".concat(booking.business.name, " foi recusada. Motivo: ").concat(reason)
                                            : "A tua reserva em ".concat(booking.business.name, " foi recusada."),
                                        data: {
                                            bookingId: booking.id,
                                            bookingType: bookingType,
                                            businessId: booking.business.id,
                                            status: client_1.HtBookingStatus.CANCELLED,
                                            reason: reason || null,
                                        },
                                    },
                                })];
                        case 8:
                            clientNotification = _d.sent();
                            this.eventsGateway.emitToUser(booking.user.id, 'booking.rejected', {
                                notificationId: clientNotification.id,
                                bookingId: booking.id,
                                bookingType: bookingType,
                                businessId: booking.business.id,
                                status: client_1.HtBookingStatus.CANCELLED,
                                reason: reason || null,
                            });
                            return [2 /*return*/, __assign(__assign({}, updatedBooking), { bookingType: bookingType })];
                    }
                });
            });
        };
        return BookingService_1;
    }());
    __setFunctionName(_classThis, "BookingService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BookingService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BookingService = _classThis;
}();
exports.BookingService = BookingService;
