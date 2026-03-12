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
exports.ClaimController = void 0;
var common_1 = require("@nestjs/common");
var ClaimController = function () {
    var _classDecorators = [(0, common_1.Controller)('claims')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _submitClaim_decorators;
    var _getMyClaims_decorators;
    var _cancelClaim_decorators;
    var _reportMissing_decorators;
    var ClaimController = _classThis = /** @class */ (function () {
        function ClaimController_1(claimService, adminService) {
            this.claimService = (__runInitializers(this, _instanceExtraInitializers), claimService);
            this.adminService = adminService;
        }
        /**
         * POST /claims/:businessId
         * Owner submits a claim request for a business
         */
        ClaimController_1.prototype.submitClaim = function (businessId, req, dto) {
            return this.claimService.submitClaim(businessId, req.user.sub, dto);
        };
        /**
         * GET /claims/mine
         * Owner views their own claim requests
         */
        ClaimController_1.prototype.getMyClaims = function (req) {
            return this.claimService.getMyClaims(req.user.sub);
        };
        /**
         * DELETE /claims/:claimId
         * Owner cancels a pending claim
         */
        ClaimController_1.prototype.cancelClaim = function (claimId, req) {
            return this.claimService.cancelClaim(claimId, req.user.sub);
        };
        /**
         * POST /claims/report-missing
         * Owner reports a business that should be on the platform but isn't
         */
        ClaimController_1.prototype.reportMissing = function (req, body) {
            return this.adminService.reportMissingBusiness(req.user.sub, body.note, body.businessName);
        };
        return ClaimController_1;
    }());
    __setFunctionName(_classThis, "ClaimController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _submitClaim_decorators = [(0, common_1.Post)(':businessId')];
        _getMyClaims_decorators = [(0, common_1.Get)('mine')];
        _cancelClaim_decorators = [(0, common_1.Delete)(':claimId')];
        _reportMissing_decorators = [(0, common_1.Post)('report-missing')];
        __esDecorate(_classThis, null, _submitClaim_decorators, { kind: "method", name: "submitClaim", static: false, private: false, access: { has: function (obj) { return "submitClaim" in obj; }, get: function (obj) { return obj.submitClaim; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getMyClaims_decorators, { kind: "method", name: "getMyClaims", static: false, private: false, access: { has: function (obj) { return "getMyClaims" in obj; }, get: function (obj) { return obj.getMyClaims; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelClaim_decorators, { kind: "method", name: "cancelClaim", static: false, private: false, access: { has: function (obj) { return "cancelClaim" in obj; }, get: function (obj) { return obj.cancelClaim; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reportMissing_decorators, { kind: "method", name: "reportMissing", static: false, private: false, access: { has: function (obj) { return "reportMissing" in obj; }, get: function (obj) { return obj.reportMissing; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ClaimController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ClaimController = _classThis;
}();
exports.ClaimController = ClaimController;
