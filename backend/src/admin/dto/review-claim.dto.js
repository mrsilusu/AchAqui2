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
exports.ReviewClaimDto = exports.ReviewDecision = void 0;
var class_validator_1 = require("class-validator");
var ReviewDecision;
(function (ReviewDecision) {
    ReviewDecision["APPROVED"] = "APPROVED";
    ReviewDecision["REJECTED"] = "REJECTED";
})(ReviewDecision || (exports.ReviewDecision = ReviewDecision = {}));
var ReviewClaimDto = function () {
    var _a;
    var _decision_decorators;
    var _decision_initializers = [];
    var _decision_extraInitializers = [];
    var _adminNote_decorators;
    var _adminNote_initializers = [];
    var _adminNote_extraInitializers = [];
    return _a = /** @class */ (function () {
            function ReviewClaimDto() {
                this.decision = __runInitializers(this, _decision_initializers, void 0);
                this.adminNote = (__runInitializers(this, _decision_extraInitializers), __runInitializers(this, _adminNote_initializers, void 0));
                __runInitializers(this, _adminNote_extraInitializers);
            }
            return ReviewClaimDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _decision_decorators = [(0, class_validator_1.IsEnum)(ReviewDecision)];
            _adminNote_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(500)];
            __esDecorate(null, null, _decision_decorators, { kind: "field", name: "decision", static: false, private: false, access: { has: function (obj) { return "decision" in obj; }, get: function (obj) { return obj.decision; }, set: function (obj, value) { obj.decision = value; } }, metadata: _metadata }, _decision_initializers, _decision_extraInitializers);
            __esDecorate(null, null, _adminNote_decorators, { kind: "field", name: "adminNote", static: false, private: false, access: { has: function (obj) { return "adminNote" in obj; }, get: function (obj) { return obj.adminNote; }, set: function (obj, value) { obj.adminNote = value; } }, metadata: _metadata }, _adminNote_initializers, _adminNote_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.ReviewClaimDto = ReviewClaimDto;
