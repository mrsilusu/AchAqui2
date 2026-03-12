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
exports.CheckInDto = void 0;
var class_validator_1 = require("class-validator");
var CheckInDto = function () {
    var _a;
    var _roomId_decorators;
    var _roomId_initializers = [];
    var _roomId_extraInitializers = [];
    var _guestName_decorators;
    var _guestName_initializers = [];
    var _guestName_extraInitializers = [];
    var _guestPhone_decorators;
    var _guestPhone_initializers = [];
    var _guestPhone_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CheckInDto() {
                this.roomId = __runInitializers(this, _roomId_initializers, void 0);
                this.guestName = (__runInitializers(this, _roomId_extraInitializers), __runInitializers(this, _guestName_initializers, void 0));
                this.guestPhone = (__runInitializers(this, _guestName_extraInitializers), __runInitializers(this, _guestPhone_initializers, void 0));
                __runInitializers(this, _guestPhone_extraInitializers);
            }
            return CheckInDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _roomId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsUUID)()];
            _guestName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _guestPhone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _roomId_decorators, { kind: "field", name: "roomId", static: false, private: false, access: { has: function (obj) { return "roomId" in obj; }, get: function (obj) { return obj.roomId; }, set: function (obj, value) { obj.roomId = value; } }, metadata: _metadata }, _roomId_initializers, _roomId_extraInitializers);
            __esDecorate(null, null, _guestName_decorators, { kind: "field", name: "guestName", static: false, private: false, access: { has: function (obj) { return "guestName" in obj; }, get: function (obj) { return obj.guestName; }, set: function (obj, value) { obj.guestName = value; } }, metadata: _metadata }, _guestName_initializers, _guestName_extraInitializers);
            __esDecorate(null, null, _guestPhone_decorators, { kind: "field", name: "guestPhone", static: false, private: false, access: { has: function (obj) { return "guestPhone" in obj; }, get: function (obj) { return obj.guestPhone; }, set: function (obj, value) { obj.guestPhone = value; } }, metadata: _metadata }, _guestPhone_initializers, _guestPhone_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CheckInDto = CheckInDto;
