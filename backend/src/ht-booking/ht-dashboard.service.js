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
exports.HtDashboardService = void 0;
// backend/src/ht-booking/ht-dashboard.service.ts
var common_1 = require("@nestjs/common");
var HtDashboardService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HtDashboardService = _classThis = /** @class */ (function () {
        function HtDashboardService_1(prisma) {
            this.prisma = prisma;
        }
        HtDashboardService_1.prototype.assertOwnership = function (businessId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var b;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findFirst({
                                where: {
                                    id: businessId,
                                    OR: [
                                        { ownerId: ownerId },
                                        // fallback: negócio sem owner ainda atribuído mas reivindicado pelo user
                                        { ownerId: null, id: businessId },
                                    ],
                                },
                            })];
                        case 1:
                            b = _a.sent();
                            if (!b)
                                throw new common_1.ForbiddenException('Sem permissão para este estabelecimento.');
                            return [2 /*return*/];
                    }
                });
            });
        };
        HtDashboardService_1.prototype.getDashboard = function (businessId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, start, end, _a, rooms, arrivalsToday, departuresToday, currentGuests, pendingTasks, revenueToday, roomStats, occupancyRate;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            now = new Date();
                            start = new Date(now);
                            start.setHours(0, 0, 0, 0);
                            end = new Date(now);
                            end.setHours(23, 59, 59, 999);
                            return [4 /*yield*/, Promise.all([
                                    // Quartos e estados
                                    this.prisma.htRoom.findMany({
                                        where: { businessId: businessId },
                                        include: {
                                            roomType: { select: { name: true, pricePerNight: true } },
                                            bookings: {
                                                where: { status: 'CHECKED_IN' },
                                                select: {
                                                    id: true,
                                                    guestName: true,
                                                    endDate: true,
                                                    user: { select: { name: true } },
                                                },
                                                take: 1,
                                            },
                                        },
                                        orderBy: [{ floor: 'asc' }, { number: 'asc' }],
                                    }),
                                    // Chegadas de hoje (PENDING ou CONFIRMED)
                                    this.prisma.htRoomBooking.count({
                                        where: {
                                            businessId: businessId,
                                            startDate: { gte: start, lte: end },
                                            status: { in: ['PENDING', 'CONFIRMED'] },
                                        },
                                    }),
                                    // Saídas de hoje (CHECKED_IN com endDate hoje)
                                    this.prisma.htRoomBooking.count({
                                        where: {
                                            businessId: businessId,
                                            endDate: { gte: start, lte: end },
                                            status: 'CHECKED_IN',
                                        },
                                    }),
                                    // Hóspedes actuais
                                    this.prisma.htRoomBooking.count({
                                        where: { businessId: businessId, status: 'CHECKED_IN' },
                                    }),
                                    // Tarefas de housekeeping pendentes
                                    this.prisma.htHousekeepingTask.count({
                                        where: {
                                            room: { businessId: businessId },
                                            completedAt: null,
                                        },
                                    }),
                                    // Receita do dia — checkouts de hoje com pagamento
                                    this.prisma.htRoomBooking.aggregate({
                                        where: {
                                            businessId: businessId,
                                            checkedOutAt: { gte: start, lte: end },
                                            paymentStatus: 'PAID',
                                        },
                                        _sum: { totalPrice: true },
                                    }),
                                ])];
                        case 1:
                            _a = _c.sent(), rooms = _a[0], arrivalsToday = _a[1], departuresToday = _a[2], currentGuests = _a[3], pendingTasks = _a[4], revenueToday = _a[5];
                            roomStats = {
                                total: rooms.length,
                                clean: rooms.filter(function (r) { return r.status === 'CLEAN'; }).length,
                                occupied: rooms.filter(function (r) { return r.status === 'CLEAN' && r.bookings.length > 0; }).length,
                                dirty: rooms.filter(function (r) { return r.status === 'DIRTY'; }).length,
                                cleaning: rooms.filter(function (r) { return r.status === 'CLEANING'; }).length,
                                maintenance: rooms.filter(function (r) { return r.status === 'MAINTENANCE'; }).length,
                            };
                            occupancyRate = rooms.length > 0
                                ? Math.round((currentGuests / rooms.length) * 100)
                                : 0;
                            return [2 /*return*/, {
                                    date: now.toISOString(),
                                    occupancyRate: occupancyRate,
                                    roomStats: roomStats,
                                    rooms: rooms.map(function (r) {
                                        var _a, _b, _c, _d;
                                        return ({
                                            id: r.id,
                                            number: r.number,
                                            floor: r.floor,
                                            status: r.status,
                                            typeName: r.roomType.name,
                                            guest: ((_a = r.bookings[0]) === null || _a === void 0 ? void 0 : _a.guestName) || ((_c = (_b = r.bookings[0]) === null || _b === void 0 ? void 0 : _b.user) === null || _c === void 0 ? void 0 : _c.name) || null,
                                            checkOut: ((_d = r.bookings[0]) === null || _d === void 0 ? void 0 : _d.endDate) || null,
                                        });
                                    }),
                                    today: {
                                        arrivals: arrivalsToday,
                                        departures: departuresToday,
                                        guests: currentGuests,
                                        revenue: (_b = revenueToday._sum.totalPrice) !== null && _b !== void 0 ? _b : 0,
                                    },
                                    housekeeping: {
                                        pendingTasks: pendingTasks,
                                    },
                                }];
                    }
                });
            });
        };
        return HtDashboardService_1;
    }());
    __setFunctionName(_classThis, "HtDashboardService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HtDashboardService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HtDashboardService = _classThis;
}();
exports.HtDashboardService = HtDashboardService;
