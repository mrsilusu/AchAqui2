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
exports.UploadBase64Dto = void 0;
var class_validator_1 = require("class-validator");
var UploadBase64Dto = function () {
    var _a;
    var _fileName_decorators;
    var _fileName_initializers = [];
    var _fileName_extraInitializers = [];
    var _mimeType_decorators;
    var _mimeType_initializers = [];
    var _mimeType_extraInitializers = [];
    var _base64_decorators;
    var _base64_initializers = [];
    var _base64_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UploadBase64Dto() {
                this.fileName = __runInitializers(this, _fileName_initializers, void 0);
                this.mimeType = (__runInitializers(this, _fileName_extraInitializers), __runInitializers(this, _mimeType_initializers, void 0));
                this.base64 = (__runInitializers(this, _mimeType_extraInitializers), __runInitializers(this, _base64_initializers, void 0));
                __runInitializers(this, _base64_extraInitializers);
            }
            return UploadBase64Dto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _fileName_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(3)];
            _mimeType_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MinLength)(3)];
            _base64_decorators = [(0, class_validator_1.IsBase64)()];
            __esDecorate(null, null, _fileName_decorators, { kind: "field", name: "fileName", static: false, private: false, access: { has: function (obj) { return "fileName" in obj; }, get: function (obj) { return obj.fileName; }, set: function (obj, value) { obj.fileName = value; } }, metadata: _metadata }, _fileName_initializers, _fileName_extraInitializers);
            __esDecorate(null, null, _mimeType_decorators, { kind: "field", name: "mimeType", static: false, private: false, access: { has: function (obj) { return "mimeType" in obj; }, get: function (obj) { return obj.mimeType; }, set: function (obj, value) { obj.mimeType = value; } }, metadata: _metadata }, _mimeType_initializers, _mimeType_extraInitializers);
            __esDecorate(null, null, _base64_decorators, { kind: "field", name: "base64", static: false, private: false, access: { has: function (obj) { return "base64" in obj; }, get: function (obj) { return obj.base64; }, set: function (obj, value) { obj.base64 = value; } }, metadata: _metadata }, _base64_initializers, _base64_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UploadBase64Dto = UploadBase64Dto;
