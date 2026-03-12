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
exports.AdminController = void 0;
var common_1 = require("@nestjs/common");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var client_1 = require("@prisma/client");
var AdminController = function () {
    var _classDecorators = [(0, common_1.Controller)('admin'), (0, roles_decorator_1.Roles)(client_1.UserRole.ADMIN)];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _getStats_decorators;
    var _getAllClaims_decorators;
    var _getPendingClaims_decorators;
    var _reviewClaim_decorators;
    var _getAllBusinesses_decorators;
    var _importFromGooglePlaces_decorators;
    var _getAllUsers_decorators;
    var AdminController = _classThis = /** @class */ (function () {
        function AdminController_1(adminService, configService) {
            this.adminService = (__runInitializers(this, _instanceExtraInitializers), adminService);
            this.configService = configService;
        }
        // ─── Stats ─────────────────────────────────────────────────────────────────
        AdminController_1.prototype.getStats = function () {
            return this.adminService.getStats();
        };
        // ─── Claims ────────────────────────────────────────────────────────────────
        AdminController_1.prototype.getAllClaims = function (status) {
            return this.adminService.getAllClaims(status);
        };
        AdminController_1.prototype.getPendingClaims = function () {
            return this.adminService.getPendingClaims();
        };
        AdminController_1.prototype.reviewClaim = function (id, req, body) {
            return this.adminService.reviewClaim(id, req.user.sub, body.decision, body.adminNote);
        };
        // ─── Businesses ────────────────────────────────────────────────────────────
        AdminController_1.prototype.getAllBusinesses = function (page, limit, search) {
            return this.adminService.getAllBusinesses(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search);
        };
        // ─── Google Places Import ──────────────────────────────────────────────────
        AdminController_1.prototype.importFromGooglePlaces = function (body) {
            var apiKey = this.configService.get('GOOGLE_PLACES_API_KEY');
            return this.adminService.importFromGooglePlaces(body.query, body.location, apiKey);
        };
        // ─── Users ─────────────────────────────────────────────────────────────────
        AdminController_1.prototype.getAllUsers = function (page, limit) {
            return this.adminService.getAllUsers(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
        };
        return AdminController_1;
    }());
    __setFunctionName(_classThis, "AdminController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _getStats_decorators = [(0, common_1.Get)('stats')];
        _getAllClaims_decorators = [(0, common_1.Get)('claims')];
        _getPendingClaims_decorators = [(0, common_1.Get)('claims/pending')];
        _reviewClaim_decorators = [(0, common_1.Patch)('claims/:id/review')];
        _getAllBusinesses_decorators = [(0, common_1.Get)('businesses')];
        _importFromGooglePlaces_decorators = [(0, common_1.Post)('import/google-places')];
        _getAllUsers_decorators = [(0, common_1.Get)('users')];
        __esDecorate(_classThis, null, _getStats_decorators, { kind: "method", name: "getStats", static: false, private: false, access: { has: function (obj) { return "getStats" in obj; }, get: function (obj) { return obj.getStats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllClaims_decorators, { kind: "method", name: "getAllClaims", static: false, private: false, access: { has: function (obj) { return "getAllClaims" in obj; }, get: function (obj) { return obj.getAllClaims; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPendingClaims_decorators, { kind: "method", name: "getPendingClaims", static: false, private: false, access: { has: function (obj) { return "getPendingClaims" in obj; }, get: function (obj) { return obj.getPendingClaims; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reviewClaim_decorators, { kind: "method", name: "reviewClaim", static: false, private: false, access: { has: function (obj) { return "reviewClaim" in obj; }, get: function (obj) { return obj.reviewClaim; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllBusinesses_decorators, { kind: "method", name: "getAllBusinesses", static: false, private: false, access: { has: function (obj) { return "getAllBusinesses" in obj; }, get: function (obj) { return obj.getAllBusinesses; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _importFromGooglePlaces_decorators, { kind: "method", name: "importFromGooglePlaces", static: false, private: false, access: { has: function (obj) { return "importFromGooglePlaces" in obj; }, get: function (obj) { return obj.importFromGooglePlaces; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAllUsers_decorators, { kind: "method", name: "getAllUsers", static: false, private: false, access: { has: function (obj) { return "getAllUsers" in obj; }, get: function (obj) { return obj.getAllUsers; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AdminController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AdminController = _classThis;
}();
exports.AdminController = AdminController;
