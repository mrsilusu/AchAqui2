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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreatePromoDto = void 0;
var class_validator_1 = require("class-validator");
var CreatePromoDto = function () {
    var _a;
    var _title_decorators;
    var _title_initializers = [];
    var _title_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _code_decorators;
    var _code_initializers = [];
    var _code_extraInitializers = [];
    var _discountPercentage_decorators;
    var _discountPercentage_initializers = [];
    var _discountPercentage_extraInitializers = [];
    var _discountFixedAmount_decorators;
    var _discountFixedAmount_initializers = [];
    var _discountFixedAmount_extraInitializers = [];
    var _expiresAt_decorators;
    var _expiresAt_initializers = [];
    var _expiresAt_extraInitializers = [];
    var _isActive_decorators;
    var _isActive_initializers = [];
    var _isActive_extraInitializers = [];
    var _businessId_decorators;
    var _businessId_initializers = [];
    var _businessId_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreatePromoDto() {
                this.title = __runInitializers(this, _title_initializers, void 0);
                this.description = (__runInitializers(this, _title_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.code = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _code_initializers, void 0)); // Código de promoção (ex: "SUMMER2024")
                this.discountPercentage = (__runInitializers(this, _code_extraInitializers), __runInitializers(this, _discountPercentage_initializers, void 0)); // 0-100
                this.discountFixedAmount = (__runInitializers(this, _discountPercentage_extraInitializers), __runInitializers(this, _discountFixedAmount_initializers, void 0)); // Valor fixo de desconto
                this.expiresAt = (__runInitializers(this, _discountFixedAmount_extraInitializers), __runInitializers(this, _expiresAt_initializers, void 0));
                this.isActive = (__runInitializers(this, _expiresAt_extraInitializers), __runInitializers(this, _isActive_initializers, void 0));
                this.businessId = (__runInitializers(this, _isActive_extraInitializers), __runInitializers(this, _businessId_initializers, void 0));
                __runInitializers(this, _businessId_extraInitializers);
            }
            return CreatePromoDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _title_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(100)];
            _description_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500), (0, class_validator_1.IsOptional)()];
            _code_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(20)];
            _discountPercentage_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(100)];
            _discountFixedAmount_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0), (0, class_validator_1.IsOptional)()];
            _expiresAt_decorators = [(0, class_validator_1.IsDateString)(), (0, class_validator_1.IsOptional)()];
            _isActive_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _businessId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _title_decorators, { kind: "field", name: "title", static: false, private: false, access: { has: function (obj) { return "title" in obj; }, get: function (obj) { return obj.title; }, set: function (obj, value) { obj.title = value; } }, metadata: _metadata }, _title_initializers, _title_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _code_decorators, { kind: "field", name: "code", static: false, private: false, access: { has: function (obj) { return "code" in obj; }, get: function (obj) { return obj.code; }, set: function (obj, value) { obj.code = value; } }, metadata: _metadata }, _code_initializers, _code_extraInitializers);
            __esDecorate(null, null, _discountPercentage_decorators, { kind: "field", name: "discountPercentage", static: false, private: false, access: { has: function (obj) { return "discountPercentage" in obj; }, get: function (obj) { return obj.discountPercentage; }, set: function (obj, value) { obj.discountPercentage = value; } }, metadata: _metadata }, _discountPercentage_initializers, _discountPercentage_extraInitializers);
            __esDecorate(null, null, _discountFixedAmount_decorators, { kind: "field", name: "discountFixedAmount", static: false, private: false, access: { has: function (obj) { return "discountFixedAmount" in obj; }, get: function (obj) { return obj.discountFixedAmount; }, set: function (obj, value) { obj.discountFixedAmount = value; } }, metadata: _metadata }, _discountFixedAmount_initializers, _discountFixedAmount_extraInitializers);
            __esDecorate(null, null, _expiresAt_decorators, { kind: "field", name: "expiresAt", static: false, private: false, access: { has: function (obj) { return "expiresAt" in obj; }, get: function (obj) { return obj.expiresAt; }, set: function (obj, value) { obj.expiresAt = value; } }, metadata: _metadata }, _expiresAt_initializers, _expiresAt_extraInitializers);
            __esDecorate(null, null, _isActive_decorators, { kind: "field", name: "isActive", static: false, private: false, access: { has: function (obj) { return "isActive" in obj; }, get: function (obj) { return obj.isActive; }, set: function (obj, value) { obj.isActive = value; } }, metadata: _metadata }, _isActive_initializers, _isActive_extraInitializers);
            __esDecorate(null, null, _businessId_decorators, { kind: "field", name: "businessId", static: false, private: false, access: { has: function (obj) { return "businessId" in obj; }, get: function (obj) { return obj.businessId; }, set: function (obj, value) { obj.businessId = value; } }, metadata: _metadata }, _businessId_initializers, _businessId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreatePromoDto = CreatePromoDto;
