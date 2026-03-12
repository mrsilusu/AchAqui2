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
exports.UpdateOperatingHourDto = void 0;
var class_validator_1 = require("class-validator");
var UpdateOperatingHourDto = function () {
    var _a;
    var _dayOfWeek_decorators;
    var _dayOfWeek_initializers = [];
    var _dayOfWeek_extraInitializers = [];
    var _openTime_decorators;
    var _openTime_initializers = [];
    var _openTime_extraInitializers = [];
    var _closeTime_decorators;
    var _closeTime_initializers = [];
    var _closeTime_extraInitializers = [];
    var _isClosed_decorators;
    var _isClosed_initializers = [];
    var _isClosed_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateOperatingHourDto() {
                this.dayOfWeek = __runInitializers(this, _dayOfWeek_initializers, void 0);
                this.openTime = (__runInitializers(this, _dayOfWeek_extraInitializers), __runInitializers(this, _openTime_initializers, void 0));
                this.closeTime = (__runInitializers(this, _openTime_extraInitializers), __runInitializers(this, _closeTime_initializers, void 0));
                this.isClosed = (__runInitializers(this, _closeTime_extraInitializers), __runInitializers(this, _isClosed_initializers, void 0));
                __runInitializers(this, _isClosed_extraInitializers);
            }
            return UpdateOperatingHourDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _dayOfWeek_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsInt)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(6)];
            _openTime_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/)];
            _closeTime_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.Matches)(/^([01]\d|2[0-3]):([0-5]\d)$/)];
            _isClosed_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsBoolean)()];
            __esDecorate(null, null, _dayOfWeek_decorators, { kind: "field", name: "dayOfWeek", static: false, private: false, access: { has: function (obj) { return "dayOfWeek" in obj; }, get: function (obj) { return obj.dayOfWeek; }, set: function (obj, value) { obj.dayOfWeek = value; } }, metadata: _metadata }, _dayOfWeek_initializers, _dayOfWeek_extraInitializers);
            __esDecorate(null, null, _openTime_decorators, { kind: "field", name: "openTime", static: false, private: false, access: { has: function (obj) { return "openTime" in obj; }, get: function (obj) { return obj.openTime; }, set: function (obj, value) { obj.openTime = value; } }, metadata: _metadata }, _openTime_initializers, _openTime_extraInitializers);
            __esDecorate(null, null, _closeTime_decorators, { kind: "field", name: "closeTime", static: false, private: false, access: { has: function (obj) { return "closeTime" in obj; }, get: function (obj) { return obj.closeTime; }, set: function (obj, value) { obj.closeTime = value; } }, metadata: _metadata }, _closeTime_initializers, _closeTime_extraInitializers);
            __esDecorate(null, null, _isClosed_decorators, { kind: "field", name: "isClosed", static: false, private: false, access: { has: function (obj) { return "isClosed" in obj; }, get: function (obj) { return obj.isClosed; }, set: function (obj, value) { obj.isClosed = value; } }, metadata: _metadata }, _isClosed_initializers, _isClosed_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateOperatingHourDto = UpdateOperatingHourDto;
