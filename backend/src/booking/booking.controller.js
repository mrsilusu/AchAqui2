"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingController = void 0;
var common_1 = require("@nestjs/common");
var throttler_1 = require("@nestjs/throttler");
var client_1 = require("@prisma/client");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
// Limite global de leitura: 60 req/min por IP
var BookingController = function () {
    var _classDecorators = [(0, common_1.UseGuards)(throttler_1.ThrottlerGuard), (0, common_1.Controller)('bookings')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _create_decorators;
    var _confirm_decorators;
    var _reject_decorators;
    var BookingController = _classThis = /** @class */ (function () {
        function BookingController_1(bookingService) {
            this.bookingService = (__runInitializers(this, _instanceExtraInitializers), bookingService);
        }
        BookingController_1.prototype.findAll = function (req) {
            return this.bookingService.findAllForUser(req.user.userId, req.user.role);
        };
        // SEGURANÇA: Rate limit agressivo em criação de reservas —
        // máximo 5 reservas por minuto por IP para prevenir DoS e spam de agenda.
        BookingController_1.prototype.create = function (req, createBookingDto) {
            // SEGURANÇA: totalPrice enviado pelo frontend é ignorado.
            // O backend recalcula o preço a partir da DB — ver BookingService.create().
            return this.bookingService.create(req.user.userId, createBookingDto);
        };
        // SEGURANÇA: confirmByOwner valida internamente que o booking.business.ownerId
        // corresponde ao req.user.userId — Cross-Tenant check garantido no service.
        BookingController_1.prototype.confirm = function (id, req, body) {
            return this.bookingService.confirmByOwner(id, req.user.userId, body === null || body === void 0 ? void 0 : body.businessId);
        };
        // SEGURANÇA: rejectByOwner valida internamente que booking.business.ownerId === currentUserId.
        // Um Owner A não consegue cancelar reservas de Owner B mesmo conhecendo o bookingId.
        BookingController_1.prototype.reject = function (id, req, body) {
            return this.bookingService.rejectByOwner(id, req.user.userId, body);
        };
        return BookingController_1;
    }());
    __setFunctionName(_classThis, "BookingController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)()];
        _create_decorators = [(0, common_1.Post)(), (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } })];
        _confirm_decorators = [(0, common_1.Patch)(':id/confirm'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER), (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } })];
        _reject_decorators = [(0, common_1.Patch)(':id/reject'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER), (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } })];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _confirm_decorators, { kind: "method", name: "confirm", static: false, private: false, access: { has: function (obj) { return "confirm" in obj; }, get: function (obj) { return obj.confirm; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reject_decorators, { kind: "method", name: "reject", static: false, private: false, access: { has: function (obj) { return "reject" in obj; }, get: function (obj) { return obj.reject; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BookingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BookingController = _classThis;
}();
exports.BookingController = BookingController;
