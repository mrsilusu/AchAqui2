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
exports.HtBookingController = void 0;
// backend/src/ht-booking/ht-booking.controller.ts
var common_1 = require("@nestjs/common");
var throttler_1 = require("@nestjs/throttler");
var client_1 = require("@prisma/client");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var HtBookingController = function () {
    var _classDecorators = [(0, common_1.UseGuards)(throttler_1.ThrottlerGuard), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER), (0, common_1.Controller)('ht')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getDashboard_decorators;
    var _getArrivals_decorators;
    var _getDepartures_decorators;
    var _getCurrentGuests_decorators;
    var _checkIn_decorators;
    var _checkOut_decorators;
    var _noShow_decorators;
    var _getFolio_decorators;
    var _addFolioItem_decorators;
    var _removeFolioItem_decorators;
    var _financialCheckout_decorators;
    var HtBookingController = _classThis = /** @class */ (function () {
        function HtBookingController_1(htBookingService, htDashboardService, htFolioService) {
            this.htBookingService = (__runInitializers(this, _instanceExtraInitializers), htBookingService);
            this.htDashboardService = htDashboardService;
            this.htFolioService = htFolioService;
        }
        // ─── Dashboard ────────────────────────────────────────────────────────────
        HtBookingController_1.prototype.getDashboard = function (businessId, req) {
            return this.htDashboardService.getDashboard(businessId, req.user.userId);
        };
        // ─── Receção ──────────────────────────────────────────────────────────────
        HtBookingController_1.prototype.getArrivals = function (businessId, req) {
            return this.htBookingService.getTodayArrivals(businessId, req.user.userId);
        };
        HtBookingController_1.prototype.getDepartures = function (businessId, req) {
            return this.htBookingService.getTodayDepartures(businessId, req.user.userId);
        };
        HtBookingController_1.prototype.getCurrentGuests = function (businessId, req) {
            return this.htBookingService.getCurrentGuests(businessId, req.user.userId);
        };
        HtBookingController_1.prototype.checkIn = function (id, dto, req, ip) {
            return this.htBookingService.checkIn(id, req.user.userId, dto, ip);
        };
        HtBookingController_1.prototype.checkOut = function (id, req, ip) {
            return this.htBookingService.checkOut(id, req.user.userId, ip);
        };
        HtBookingController_1.prototype.noShow = function (id, req, ip) {
            return this.htBookingService.markNoShow(id, req.user.userId, ip);
        };
        // ─── Folio (Sprint 3) ─────────────────────────────────────────────────────
        HtBookingController_1.prototype.getFolio = function (id, req) {
            return this.htFolioService.getFolio(id, req.user.userId);
        };
        HtBookingController_1.prototype.addFolioItem = function (id, dto, req) {
            return this.htFolioService.addItem(id, req.user.userId, dto);
        };
        HtBookingController_1.prototype.removeFolioItem = function (bookingId, itemId, req, body) {
            return this.htFolioService.removeItem(bookingId, itemId, req.user.userId, body === null || body === void 0 ? void 0 : body.reason);
        };
        HtBookingController_1.prototype.financialCheckout = function (id, dto, req) {
            return this.htFolioService.financialCheckout(id, req.user.userId, dto);
        };
        return HtBookingController_1;
    }());
    __setFunctionName(_classThis, "HtBookingController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getDashboard_decorators = [(0, common_1.Get)('dashboard')];
        _getArrivals_decorators = [(0, common_1.Get)('bookings/arrivals')];
        _getDepartures_decorators = [(0, common_1.Get)('bookings/departures')];
        _getCurrentGuests_decorators = [(0, common_1.Get)('bookings/guests')];
        _checkIn_decorators = [(0, common_1.Patch)('bookings/:id/checkin'), (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } })];
        _checkOut_decorators = [(0, common_1.Patch)('bookings/:id/checkout'), (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } })];
        _noShow_decorators = [(0, common_1.Patch)('bookings/:id/noshow'), (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } })];
        _getFolio_decorators = [(0, common_1.Get)('bookings/:id/folio')];
        _addFolioItem_decorators = [(0, common_1.Post)('bookings/:id/folio'), (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60000 } })];
        _removeFolioItem_decorators = [(0, common_1.Delete)('bookings/:bookingId/folio/:itemId'), (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60000 } })];
        _financialCheckout_decorators = [(0, common_1.Post)('bookings/:id/financial-checkout'), (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } })];
        __esDecorate(_classThis, null, _getDashboard_decorators, { kind: "method", name: "getDashboard", static: false, private: false, access: { has: function (obj) { return "getDashboard" in obj; }, get: function (obj) { return obj.getDashboard; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getArrivals_decorators, { kind: "method", name: "getArrivals", static: false, private: false, access: { has: function (obj) { return "getArrivals" in obj; }, get: function (obj) { return obj.getArrivals; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getDepartures_decorators, { kind: "method", name: "getDepartures", static: false, private: false, access: { has: function (obj) { return "getDepartures" in obj; }, get: function (obj) { return obj.getDepartures; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getCurrentGuests_decorators, { kind: "method", name: "getCurrentGuests", static: false, private: false, access: { has: function (obj) { return "getCurrentGuests" in obj; }, get: function (obj) { return obj.getCurrentGuests; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _checkIn_decorators, { kind: "method", name: "checkIn", static: false, private: false, access: { has: function (obj) { return "checkIn" in obj; }, get: function (obj) { return obj.checkIn; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _checkOut_decorators, { kind: "method", name: "checkOut", static: false, private: false, access: { has: function (obj) { return "checkOut" in obj; }, get: function (obj) { return obj.checkOut; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _noShow_decorators, { kind: "method", name: "noShow", static: false, private: false, access: { has: function (obj) { return "noShow" in obj; }, get: function (obj) { return obj.noShow; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getFolio_decorators, { kind: "method", name: "getFolio", static: false, private: false, access: { has: function (obj) { return "getFolio" in obj; }, get: function (obj) { return obj.getFolio; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _addFolioItem_decorators, { kind: "method", name: "addFolioItem", static: false, private: false, access: { has: function (obj) { return "addFolioItem" in obj; }, get: function (obj) { return obj.addFolioItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeFolioItem_decorators, { kind: "method", name: "removeFolioItem", static: false, private: false, access: { has: function (obj) { return "removeFolioItem" in obj; }, get: function (obj) { return obj.removeFolioItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _financialCheckout_decorators, { kind: "method", name: "financialCheckout", static: false, private: false, access: { has: function (obj) { return "financialCheckout" in obj; }, get: function (obj) { return obj.financialCheckout; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        HtBookingController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return HtBookingController = _classThis;
}();
exports.HtBookingController = HtBookingController;
