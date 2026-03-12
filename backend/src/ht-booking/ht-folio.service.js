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
exports.HtFolioService = exports.FinancialCheckoutDto = exports.AddFolioItemDto = void 0;
// backend/src/ht-booking/ht-folio.service.ts
var common_1 = require("@nestjs/common");
var class_validator_1 = require("class-validator");
var client_1 = require("@prisma/client");
var AddFolioItemDto = function () {
    var _a;
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _quantity_decorators;
    var _quantity_initializers = [];
    var _quantity_extraInitializers = [];
    var _unitPrice_decorators;
    var _unitPrice_initializers = [];
    var _unitPrice_extraInitializers = [];
    return _a = /** @class */ (function () {
            function AddFolioItemDto() {
                this.type = __runInitializers(this, _type_initializers, void 0);
                this.description = (__runInitializers(this, _type_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.quantity = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _quantity_initializers, void 0));
                this.unitPrice = (__runInitializers(this, _quantity_extraInitializers), __runInitializers(this, _unitPrice_initializers, void 0));
                __runInitializers(this, _unitPrice_extraInitializers);
            }
            return AddFolioItemDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _type_decorators = [(0, class_validator_1.IsEnum)(client_1.HtFolioItemType)];
            _description_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(80)];
            _quantity_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1)];
            _unitPrice_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0.01)];
            __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _quantity_decorators, { kind: "field", name: "quantity", static: false, private: false, access: { has: function (obj) { return "quantity" in obj; }, get: function (obj) { return obj.quantity; }, set: function (obj, value) { obj.quantity = value; } }, metadata: _metadata }, _quantity_initializers, _quantity_extraInitializers);
            __esDecorate(null, null, _unitPrice_decorators, { kind: "field", name: "unitPrice", static: false, private: false, access: { has: function (obj) { return "unitPrice" in obj; }, get: function (obj) { return obj.unitPrice; }, set: function (obj, value) { obj.unitPrice = value; } }, metadata: _metadata }, _unitPrice_initializers, _unitPrice_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.AddFolioItemDto = AddFolioItemDto;
var FinancialCheckoutDto = function () {
    var _a;
    var _paymentMethod_decorators;
    var _paymentMethod_initializers = [];
    var _paymentMethod_extraInitializers = [];
    var _depositPaid_decorators;
    var _depositPaid_initializers = [];
    var _depositPaid_extraInitializers = [];
    var _discountAmount_decorators;
    var _discountAmount_initializers = [];
    var _discountAmount_extraInitializers = [];
    var _discountReason_decorators;
    var _discountReason_initializers = [];
    var _discountReason_extraInitializers = [];
    return _a = /** @class */ (function () {
            function FinancialCheckoutDto() {
                this.paymentMethod = __runInitializers(this, _paymentMethod_initializers, void 0);
                this.depositPaid = (__runInitializers(this, _paymentMethod_extraInitializers), __runInitializers(this, _depositPaid_initializers, void 0));
                this.discountAmount = (__runInitializers(this, _depositPaid_extraInitializers), __runInitializers(this, _discountAmount_initializers, void 0));
                this.discountReason = (__runInitializers(this, _discountAmount_extraInitializers), __runInitializers(this, _discountReason_initializers, void 0));
                __runInitializers(this, _discountReason_extraInitializers);
            }
            return FinancialCheckoutDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _paymentMethod_decorators = [(0, class_validator_1.IsEnum)(client_1.HtPaymentMethod)];
            _depositPaid_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            _discountAmount_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            _discountReason_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(120)];
            __esDecorate(null, null, _paymentMethod_decorators, { kind: "field", name: "paymentMethod", static: false, private: false, access: { has: function (obj) { return "paymentMethod" in obj; }, get: function (obj) { return obj.paymentMethod; }, set: function (obj, value) { obj.paymentMethod = value; } }, metadata: _metadata }, _paymentMethod_initializers, _paymentMethod_extraInitializers);
            __esDecorate(null, null, _depositPaid_decorators, { kind: "field", name: "depositPaid", static: false, private: false, access: { has: function (obj) { return "depositPaid" in obj; }, get: function (obj) { return obj.depositPaid; }, set: function (obj, value) { obj.depositPaid = value; } }, metadata: _metadata }, _depositPaid_initializers, _depositPaid_extraInitializers);
            __esDecorate(null, null, _discountAmount_decorators, { kind: "field", name: "discountAmount", static: false, private: false, access: { has: function (obj) { return "discountAmount" in obj; }, get: function (obj) { return obj.discountAmount; }, set: function (obj, value) { obj.discountAmount = value; } }, metadata: _metadata }, _discountAmount_initializers, _discountAmount_extraInitializers);
            __esDecorate(null, null, _discountReason_decorators, { kind: "field", name: "discountReason", static: false, private: false, access: { has: function (obj) { return "discountReason" in obj; }, get: function (obj) { return obj.discountReason; }, set: function (obj, value) { obj.discountReason = value; } }, metadata: _metadata }, _discountReason_initializers, _discountReason_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.FinancialCheckoutDto = FinancialCheckoutDto;
var HtFolioService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var HtFolioService = _classThis = /** @class */ (function () {
        function HtFolioService_1(prisma) {
            this.prisma = prisma;
        }
        // ─── Validar que a reserva pertence ao owner ──────────────────────────────
        HtFolioService_1.prototype.assertOwner = function (bookingId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var booking;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.htRoomBooking.findFirst({
                                where: { id: bookingId, business: { ownerId: ownerId } },
                                include: {
                                    business: { select: { id: true, name: true } },
                                    room: { select: { id: true, number: true } },
                                    user: { select: { id: true, name: true, email: true } },
                                    folio: {
                                        where: { removedAt: null },
                                        orderBy: { addedAt: 'asc' },
                                    },
                                },
                            })];
                        case 1:
                            booking = _a.sent();
                            if (!booking)
                                throw new common_1.ForbiddenException('Reserva não encontrada ou sem permissão.');
                            return [2 /*return*/, booking];
                    }
                });
            });
        };
        // ─── Listar folio completo ────────────────────────────────────────────────
        HtFolioService_1.prototype.getFolio = function (bookingId, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, subtotal, totalPrice, paid;
                var _a, _b, _c, _d;
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0: return [4 /*yield*/, this.assertOwner(bookingId, ownerId)];
                        case 1:
                            booking = _e.sent();
                            subtotal = booking.folio.reduce(function (s, i) { return s + i.amount; }, 0);
                            totalPrice = (_a = booking.totalPrice) !== null && _a !== void 0 ? _a : 0;
                            paid = (_b = booking.depositPaid) !== null && _b !== void 0 ? _b : 0;
                            return [2 /*return*/, {
                                    booking: {
                                        id: booking.id,
                                        guestName: booking.guestName || ((_c = booking.user) === null || _c === void 0 ? void 0 : _c.name),
                                        room: (_d = booking.room) === null || _d === void 0 ? void 0 : _d.number,
                                        startDate: booking.startDate,
                                        endDate: booking.endDate,
                                        status: booking.status,
                                        paymentStatus: booking.paymentStatus,
                                        paymentMethod: booking.paymentMethod,
                                        totalPrice: totalPrice,
                                        depositPaid: paid,
                                        balance: totalPrice - paid,
                                    },
                                    items: booking.folio,
                                    summary: {
                                        subtotal: subtotal,
                                        totalPrice: totalPrice,
                                        depositPaid: paid,
                                        balance: totalPrice - paid,
                                    },
                                }];
                    }
                });
            });
        };
        // ─── Adicionar item ao folio ──────────────────────────────────────────────
        HtFolioService_1.prototype.addItem = function (bookingId, ownerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, amount, item;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertOwner(bookingId, ownerId)];
                        case 1:
                            booking = _a.sent();
                            if (booking.status === 'CHECKED_OUT' || booking.status === 'CANCELLED') {
                                throw new common_1.BadRequestException('Não é possível adicionar itens a uma reserva encerrada.');
                            }
                            amount = dto.quantity * dto.unitPrice;
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var newItem, folioItems, newTotal;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.htFolioItem.create({
                                                    data: {
                                                        businessId: booking.businessId,
                                                        bookingId: bookingId,
                                                        type: dto.type,
                                                        description: dto.description,
                                                        quantity: dto.quantity,
                                                        unitPrice: dto.unitPrice,
                                                        amount: amount,
                                                    },
                                                })];
                                            case 1:
                                                newItem = _a.sent();
                                                return [4 /*yield*/, tx.htFolioItem.findMany({
                                                        where: { bookingId: bookingId, removedAt: null },
                                                    })];
                                            case 2:
                                                folioItems = _a.sent();
                                                newTotal = folioItems.reduce(function (s, i) { return s + i.amount; }, 0);
                                                return [4 /*yield*/, tx.htRoomBooking.update({
                                                        where: { id: bookingId },
                                                        data: { totalPrice: newTotal, version: { increment: 1 } },
                                                    })];
                                            case 3:
                                                _a.sent();
                                                return [2 /*return*/, newItem];
                                        }
                                    });
                                }); })];
                        case 2:
                            item = _a.sent();
                            return [2 /*return*/, item];
                    }
                });
            });
        };
        // ─── Remover item do folio (soft delete) ─────────────────────────────────
        HtFolioService_1.prototype.removeItem = function (bookingId, itemId, ownerId, reason) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, item;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.assertOwner(bookingId, ownerId)];
                        case 1:
                            booking = _a.sent();
                            if (booking.status === 'CHECKED_OUT') {
                                throw new common_1.BadRequestException('Reserva já encerrada.');
                            }
                            item = booking.folio.find(function (i) { return i.id === itemId; });
                            if (!item)
                                throw new common_1.NotFoundException('Item não encontrado no folio.');
                            if (item.type === 'ACCOMMODATION') {
                                throw new common_1.BadRequestException('O item de alojamento não pode ser removido manualmente.');
                            }
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    var remaining, newTotal;
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, tx.htFolioItem.update({
                                                    where: { id: itemId },
                                                    data: { removedAt: new Date(), removedById: ownerId, removeReason: reason },
                                                })];
                                            case 1:
                                                _a.sent();
                                                return [4 /*yield*/, tx.htFolioItem.findMany({
                                                        where: { bookingId: bookingId, removedAt: null },
                                                    })];
                                            case 2:
                                                remaining = _a.sent();
                                                newTotal = remaining.reduce(function (s, i) { return s + i.amount; }, 0);
                                                return [4 /*yield*/, tx.htRoomBooking.update({
                                                        where: { id: bookingId },
                                                        data: { totalPrice: newTotal, version: { increment: 1 } },
                                                    })];
                                            case 3:
                                                _a.sent();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { success: true }];
                    }
                });
            });
        };
        // ─── Checkout financeiro — registar pagamento ─────────────────────────────
        HtFolioService_1.prototype.financialCheckout = function (bookingId, ownerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var booking, subtotal, discount, finalTotal, depositPaid, balance, updated, receipt;
                var _this = this;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0: return [4 /*yield*/, this.assertOwner(bookingId, ownerId)];
                        case 1:
                            booking = _d.sent();
                            if (booking.status !== 'CHECKED_IN' && booking.status !== 'CHECKED_OUT') {
                                throw new common_1.BadRequestException('Reserva não está em estado válido para checkout financeiro.');
                            }
                            subtotal = booking.folio.reduce(function (s, i) { return s + i.amount; }, 0);
                            discount = (_a = dto.discountAmount) !== null && _a !== void 0 ? _a : 0;
                            finalTotal = Math.max(0, subtotal - discount);
                            depositPaid = (_c = (_b = dto.depositPaid) !== null && _b !== void 0 ? _b : booking.depositPaid) !== null && _c !== void 0 ? _c : 0;
                            balance = Math.max(0, finalTotal - depositPaid);
                            return [4 /*yield*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0:
                                                if (!(discount > 0)) return [3 /*break*/, 2];
                                                return [4 /*yield*/, tx.htFolioItem.create({
                                                        data: {
                                                            businessId: booking.businessId,
                                                            bookingId: bookingId,
                                                            type: 'ACCOMMODATION',
                                                            description: dto.discountReason || 'Desconto',
                                                            quantity: 1,
                                                            unitPrice: -discount,
                                                            amount: -discount,
                                                        },
                                                    })];
                                            case 1:
                                                _a.sent();
                                                _a.label = 2;
                                            case 2: return [2 /*return*/, tx.htRoomBooking.update({
                                                    where: { id: bookingId },
                                                    data: {
                                                        totalPrice: finalTotal,
                                                        depositPaid: depositPaid + balance, // marca como pago
                                                        paymentStatus: 'PAID',
                                                        paymentMethod: dto.paymentMethod,
                                                        version: { increment: 1 },
                                                    },
                                                    include: {
                                                        folio: { where: { removedAt: null }, orderBy: { addedAt: 'asc' } },
                                                        room: { select: { id: true, number: true } },
                                                        business: { select: { id: true, name: true } },
                                                        user: { select: { id: true, name: true, email: true } },
                                                    },
                                                })];
                                        }
                                    });
                                }); })];
                        case 2:
                            updated = _d.sent();
                            receipt = this.generateReceipt(updated, booking.folio);
                            return [2 /*return*/, { booking: updated, receipt: receipt }];
                    }
                });
            });
        };
        // ─── Gerar dados do recibo ────────────────────────────────────────────────
        HtFolioService_1.prototype.generateReceipt = function (booking, items) {
            var _a, _b, _c;
            var nights = Math.max(1, Math.round((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / 86400000));
            return {
                receiptNumber: "REC-".concat(Date.now()),
                issuedAt: new Date().toISOString(),
                business: booking.business,
                guest: {
                    name: booking.guestName || ((_a = booking.user) === null || _a === void 0 ? void 0 : _a.name),
                    email: (_b = booking.user) === null || _b === void 0 ? void 0 : _b.email,
                },
                stay: {
                    room: (_c = booking.room) === null || _c === void 0 ? void 0 : _c.number,
                    startDate: booking.startDate,
                    endDate: booking.endDate,
                    nights: nights,
                },
                items: items.map(function (i) { return ({
                    description: i.description,
                    quantity: i.quantity,
                    unitPrice: i.unitPrice,
                    amount: i.amount,
                }); }),
                summary: {
                    total: booking.totalPrice,
                    depositPaid: booking.depositPaid,
                    balance: 0,
                    paymentMethod: booking.paymentMethod,
                    paymentStatus: booking.paymentStatus,
                },
            };
        };
        return HtFolioService_1;
    }());
    __setFunctionName(_classThis, "HtFolioService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HtFolioService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HtFolioService = _classThis;
}();
exports.HtFolioService = HtFolioService;
