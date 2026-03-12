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
exports.UpdateOwnerSettingsDto = void 0;
var class_validator_1 = require("class-validator");
var UpdateOwnerSettingsDto = function () {
    var _a;
    var _darkMode_decorators;
    var _darkMode_initializers = [];
    var _darkMode_extraInitializers = [];
    var _notificationsEnabled_decorators;
    var _notificationsEnabled_initializers = [];
    var _notificationsEnabled_extraInitializers = [];
    var _autoReplyEnabled_decorators;
    var _autoReplyEnabled_initializers = [];
    var _autoReplyEnabled_extraInitializers = [];
    var _autoReplyMessage_decorators;
    var _autoReplyMessage_initializers = [];
    var _autoReplyMessage_extraInitializers = [];
    var _instantBookingEnabled_decorators;
    var _instantBookingEnabled_initializers = [];
    var _instantBookingEnabled_extraInitializers = [];
    return _a = /** @class */ (function () {
            function UpdateOwnerSettingsDto() {
                this.darkMode = __runInitializers(this, _darkMode_initializers, void 0);
                this.notificationsEnabled = (__runInitializers(this, _darkMode_extraInitializers), __runInitializers(this, _notificationsEnabled_initializers, void 0));
                this.autoReplyEnabled = (__runInitializers(this, _notificationsEnabled_extraInitializers), __runInitializers(this, _autoReplyEnabled_initializers, void 0));
                this.autoReplyMessage = (__runInitializers(this, _autoReplyEnabled_extraInitializers), __runInitializers(this, _autoReplyMessage_initializers, void 0));
                this.instantBookingEnabled = (__runInitializers(this, _autoReplyMessage_extraInitializers), __runInitializers(this, _instantBookingEnabled_initializers, void 0));
                __runInitializers(this, _instantBookingEnabled_extraInitializers);
            }
            return UpdateOwnerSettingsDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _darkMode_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _notificationsEnabled_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _autoReplyEnabled_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _autoReplyMessage_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500), (0, class_validator_1.IsOptional)()];
            _instantBookingEnabled_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _darkMode_decorators, { kind: "field", name: "darkMode", static: false, private: false, access: { has: function (obj) { return "darkMode" in obj; }, get: function (obj) { return obj.darkMode; }, set: function (obj, value) { obj.darkMode = value; } }, metadata: _metadata }, _darkMode_initializers, _darkMode_extraInitializers);
            __esDecorate(null, null, _notificationsEnabled_decorators, { kind: "field", name: "notificationsEnabled", static: false, private: false, access: { has: function (obj) { return "notificationsEnabled" in obj; }, get: function (obj) { return obj.notificationsEnabled; }, set: function (obj, value) { obj.notificationsEnabled = value; } }, metadata: _metadata }, _notificationsEnabled_initializers, _notificationsEnabled_extraInitializers);
            __esDecorate(null, null, _autoReplyEnabled_decorators, { kind: "field", name: "autoReplyEnabled", static: false, private: false, access: { has: function (obj) { return "autoReplyEnabled" in obj; }, get: function (obj) { return obj.autoReplyEnabled; }, set: function (obj, value) { obj.autoReplyEnabled = value; } }, metadata: _metadata }, _autoReplyEnabled_initializers, _autoReplyEnabled_extraInitializers);
            __esDecorate(null, null, _autoReplyMessage_decorators, { kind: "field", name: "autoReplyMessage", static: false, private: false, access: { has: function (obj) { return "autoReplyMessage" in obj; }, get: function (obj) { return obj.autoReplyMessage; }, set: function (obj, value) { obj.autoReplyMessage = value; } }, metadata: _metadata }, _autoReplyMessage_initializers, _autoReplyMessage_extraInitializers);
            __esDecorate(null, null, _instantBookingEnabled_decorators, { kind: "field", name: "instantBookingEnabled", static: false, private: false, access: { has: function (obj) { return "instantBookingEnabled" in obj; }, get: function (obj) { return obj.instantBookingEnabled; }, set: function (obj, value) { obj.instantBookingEnabled = value; } }, metadata: _metadata }, _instantBookingEnabled_initializers, _instantBookingEnabled_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.UpdateOwnerSettingsDto = UpdateOwnerSettingsDto;
