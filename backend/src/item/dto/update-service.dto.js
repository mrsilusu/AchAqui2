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
exports.UpdateServiceDto = void 0;
var class_validator_1 = require("class-validator");
var UpdateServiceDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _basePrice_decorators;
    var _basePrice_initializers = [];
    var _basePrice_extraInitializers = [];
    var _duration_decorators;
    var _duration_initializers = [];
    var _duration_extraInitializers = [];
    var _available_decorators;
    var _available_initializers = [];
    var _available_extraInitializers = [];
    var _businessId_decorators;
    var _businessId_initializers = [];
    var _businessId_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateServiceDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.basePrice = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _basePrice_initializers, void 0));
                this.duration = (__runInitializers(this, _basePrice_extraInitializers), __runInitializers(this, _duration_initializers, void 0));
                this.available = (__runInitializers(this, _duration_extraInitializers), __runInitializers(this, _available_initializers, void 0));
                this.businessId = (__runInitializers(this, _available_extraInitializers), __runInitializers(this, _businessId_initializers, void 0));
                __runInitializers(this, _businessId_extraInitializers);
            }
            return UpdateServiceDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(100), (0, class_validator_1.IsOptional)()];
            _description_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500), (0, class_validator_1.IsOptional)()];
            _basePrice_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0), (0, class_validator_1.IsOptional)()];
            _duration_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(50), (0, class_validator_1.IsOptional)()];
            _available_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _businessId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _basePrice_decorators, { kind: "field", name: "basePrice", static: false, private: false, access: { has: function (obj) { return "basePrice" in obj; }, get: function (obj) { return obj.basePrice; }, set: function (obj, value) { obj.basePrice = value; } }, metadata: _metadata }, _basePrice_initializers, _basePrice_extraInitializers);
            __esDecorate(null, null, _duration_decorators, { kind: "field", name: "duration", static: false, private: false, access: { has: function (obj) { return "duration" in obj; }, get: function (obj) { return obj.duration; }, set: function (obj, value) { obj.duration = value; } }, metadata: _metadata }, _duration_initializers, _duration_extraInitializers);
            __esDecorate(null, null, _available_decorators, { kind: "field", name: "available", static: false, private: false, access: { has: function (obj) { return "available" in obj; }, get: function (obj) { return obj.available; }, set: function (obj, value) { obj.available = value; } }, metadata: _metadata }, _available_initializers, _available_extraInitializers);
            __esDecorate(null, null, _businessId_decorators, { kind: "field", name: "businessId", static: false, private: false, access: { has: function (obj) { return "businessId" in obj; }, get: function (obj) { return obj.businessId; }, set: function (obj, value) { obj.businessId = value; } }, metadata: _metadata }, _businessId_initializers, _businessId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateServiceDto = UpdateServiceDto;
