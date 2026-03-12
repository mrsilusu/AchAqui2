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
exports.BusinessController = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var public_decorator_1 = require("../auth/decorators/public.decorator");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var BusinessController = function () {
    var _classDecorators = [(0, common_1.Controller)(['business', 'businesses'])];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAll_decorators;
    var _search_decorators;
    var _findOne_decorators;
    var _create_decorators;
    var _update_decorators;
    var _updateStatus_decorators;
    var _updateInfo_decorators;
    var _getPromosByBusiness_decorators;
    var _createPromo_decorators;
    var _updatePromo_decorators;
    var _deletePromo_decorators;
    var _remove_decorators;
    var BusinessController = _classThis = /** @class */ (function () {
        function BusinessController_1(businessService) {
            this.businessService = (__runInitializers(this, _instanceExtraInitializers), businessService);
        }
        BusinessController_1.prototype.findAll = function () {
            return this.businessService.findAll();
        };
        BusinessController_1.prototype.search = function (latitude, longitude, radiusKm, q, municipality) {
            // Name-based search for ClaimFlow
            if (q) {
                return this.businessService.searchByName(q, municipality);
            }
            return this.businessService.searchNearby({
                latitude: latitude,
                longitude: longitude,
                radiusKm: radiusKm,
            });
        };
        BusinessController_1.prototype.findOne = function (id) {
            return this.businessService.findOne(id);
        };
        BusinessController_1.prototype.create = function (req, body) {
            return this.businessService.create(req.user.userId, body);
        };
        BusinessController_1.prototype.update = function (id, req, body) {
            return this.businessService.update(id, req.user.userId, body);
        };
        BusinessController_1.prototype.updateStatus = function (id, req, body) {
            return this.businessService.updateStatus(id, req.user.userId, body.isOpen);
        };
        BusinessController_1.prototype.updateInfo = function (id, req, body) {
            return this.businessService.updateInfo(id, req.user.userId, body);
        };
        // ─────────────────────────────────────────────────────────────────────────
        // PROMOTIONS ENDPOINTS (Secção 11 — Promo Manager)
        // ─────────────────────────────────────────────────────────────────────────
        BusinessController_1.prototype.getPromosByBusiness = function (businessId) {
            return this.businessService.getPromosByBusiness(businessId);
        };
        BusinessController_1.prototype.createPromo = function (req, businessId, body) {
            return this.businessService.createPromo(businessId, req.user.userId, body);
        };
        BusinessController_1.prototype.updatePromo = function (req, promoId, body) {
            return this.businessService.updatePromo(promoId, req.user.userId, body);
        };
        BusinessController_1.prototype.deletePromo = function (req, promoId) {
            return this.businessService.deletePromo(promoId, req.user.userId);
        };
        BusinessController_1.prototype.remove = function (id, req) {
            return this.businessService.remove(id, req.user.userId);
        };
        return BusinessController_1;
    }());
    __setFunctionName(_classThis, "BusinessController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAll_decorators = [(0, common_1.Get)(), (0, public_decorator_1.Public)()];
        _search_decorators = [(0, common_1.Get)('search'), (0, public_decorator_1.Public)()];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, public_decorator_1.Public)()];
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _update_decorators = [(0, common_1.Patch)(':id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _updateStatus_decorators = [(0, common_1.Patch)(':id/status'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _updateInfo_decorators = [(0, common_1.Patch)(':id/info'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _getPromosByBusiness_decorators = [(0, common_1.Get)(':businessId/promos'), (0, public_decorator_1.Public)()];
        _createPromo_decorators = [(0, common_1.Post)(':businessId/promos'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _updatePromo_decorators = [(0, common_1.Patch)('promos/:promoId'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _deletePromo_decorators = [(0, common_1.Delete)('promos/:promoId'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _remove_decorators = [(0, common_1.Delete)(':id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        __esDecorate(_classThis, null, _findAll_decorators, { kind: "method", name: "findAll", static: false, private: false, access: { has: function (obj) { return "findAll" in obj; }, get: function (obj) { return obj.findAll; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _search_decorators, { kind: "method", name: "search", static: false, private: false, access: { has: function (obj) { return "search" in obj; }, get: function (obj) { return obj.search; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStatus_decorators, { kind: "method", name: "updateStatus", static: false, private: false, access: { has: function (obj) { return "updateStatus" in obj; }, get: function (obj) { return obj.updateStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateInfo_decorators, { kind: "method", name: "updateInfo", static: false, private: false, access: { has: function (obj) { return "updateInfo" in obj; }, get: function (obj) { return obj.updateInfo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPromosByBusiness_decorators, { kind: "method", name: "getPromosByBusiness", static: false, private: false, access: { has: function (obj) { return "getPromosByBusiness" in obj; }, get: function (obj) { return obj.getPromosByBusiness; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createPromo_decorators, { kind: "method", name: "createPromo", static: false, private: false, access: { has: function (obj) { return "createPromo" in obj; }, get: function (obj) { return obj.createPromo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updatePromo_decorators, { kind: "method", name: "updatePromo", static: false, private: false, access: { has: function (obj) { return "updatePromo" in obj; }, get: function (obj) { return obj.updatePromo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deletePromo_decorators, { kind: "method", name: "deletePromo", static: false, private: false, access: { has: function (obj) { return "deletePromo" in obj; }, get: function (obj) { return obj.deletePromo; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        BusinessController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return BusinessController = _classThis;
}();
exports.BusinessController = BusinessController;
