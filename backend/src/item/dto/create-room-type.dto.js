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
exports.CreateRoomTypeDto = void 0;
var class_validator_1 = require("class-validator");
var CreateRoomTypeDto = function () {
    var _a;
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var _pricePerNight_decorators;
    var _pricePerNight_initializers = [];
    var _pricePerNight_extraInitializers = [];
    var _maxGuests_decorators;
    var _maxGuests_initializers = [];
    var _maxGuests_extraInitializers = [];
    var _totalRooms_decorators;
    var _totalRooms_initializers = [];
    var _totalRooms_extraInitializers = [];
    var _available_decorators;
    var _available_initializers = [];
    var _available_extraInitializers = [];
    var _amenities_decorators;
    var _amenities_initializers = [];
    var _amenities_extraInitializers = [];
    var _minNights_decorators;
    var _minNights_initializers = [];
    var _minNights_extraInitializers = [];
    var _taxRate_decorators;
    var _taxRate_initializers = [];
    var _taxRate_extraInitializers = [];
    var _weekendMultiplier_decorators;
    var _weekendMultiplier_initializers = [];
    var _weekendMultiplier_extraInitializers = [];
    var _seasonalRates_decorators;
    var _seasonalRates_initializers = [];
    var _seasonalRates_extraInitializers = [];
    var _photos_decorators;
    var _photos_initializers = [];
    var _photos_extraInitializers = [];
    var _businessId_decorators;
    var _businessId_initializers = [];
    var _businessId_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateRoomTypeDto() {
                this.name = __runInitializers(this, _name_initializers, void 0);
                this.description = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _description_initializers, void 0));
                this.pricePerNight = (__runInitializers(this, _description_extraInitializers), __runInitializers(this, _pricePerNight_initializers, void 0));
                this.maxGuests = (__runInitializers(this, _pricePerNight_extraInitializers), __runInitializers(this, _maxGuests_initializers, void 0));
                this.totalRooms = (__runInitializers(this, _maxGuests_extraInitializers), __runInitializers(this, _totalRooms_initializers, void 0));
                this.available = (__runInitializers(this, _totalRooms_extraInitializers), __runInitializers(this, _available_initializers, void 0));
                this.amenities = (__runInitializers(this, _available_extraInitializers), __runInitializers(this, _amenities_initializers, void 0));
                this.minNights = (__runInitializers(this, _amenities_extraInitializers), __runInitializers(this, _minNights_initializers, void 0));
                this.taxRate = (__runInitializers(this, _minNights_extraInitializers), __runInitializers(this, _taxRate_initializers, void 0));
                this.weekendMultiplier = (__runInitializers(this, _taxRate_extraInitializers), __runInitializers(this, _weekendMultiplier_initializers, void 0));
                this.seasonalRates = (__runInitializers(this, _weekendMultiplier_extraInitializers), __runInitializers(this, _seasonalRates_initializers, void 0));
                this.photos = (__runInitializers(this, _seasonalRates_extraInitializers), __runInitializers(this, _photos_initializers, void 0));
                this.businessId = (__runInitializers(this, _photos_extraInitializers), __runInitializers(this, _businessId_initializers, void 0));
                __runInitializers(this, _businessId_extraInitializers);
            }
            return CreateRoomTypeDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _name_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(100)];
            _description_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.MaxLength)(1000), (0, class_validator_1.IsOptional)()];
            _pricePerNight_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0)];
            _maxGuests_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_validator_1.IsOptional)()];
            _totalRooms_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_validator_1.IsOptional)()];
            _available_decorators = [(0, class_validator_1.IsBoolean)(), (0, class_validator_1.IsOptional)()];
            _amenities_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true }), (0, class_validator_1.IsOptional)()];
            _minNights_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_validator_1.IsOptional)()];
            _taxRate_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(0), (0, class_validator_1.Max)(100), (0, class_validator_1.IsOptional)()];
            _weekendMultiplier_decorators = [(0, class_validator_1.IsNumber)(), (0, class_validator_1.Min)(1), (0, class_validator_1.IsOptional)()];
            _seasonalRates_decorators = [(0, class_validator_1.IsOptional)()];
            _photos_decorators = [(0, class_validator_1.IsArray)(), (0, class_validator_1.IsString)({ each: true }), (0, class_validator_1.IsOptional)()];
            _businessId_decorators = [(0, class_validator_1.IsString)(), (0, class_validator_1.IsOptional)()];
            __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
            __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
            __esDecorate(null, null, _pricePerNight_decorators, { kind: "field", name: "pricePerNight", static: false, private: false, access: { has: function (obj) { return "pricePerNight" in obj; }, get: function (obj) { return obj.pricePerNight; }, set: function (obj, value) { obj.pricePerNight = value; } }, metadata: _metadata }, _pricePerNight_initializers, _pricePerNight_extraInitializers);
            __esDecorate(null, null, _maxGuests_decorators, { kind: "field", name: "maxGuests", static: false, private: false, access: { has: function (obj) { return "maxGuests" in obj; }, get: function (obj) { return obj.maxGuests; }, set: function (obj, value) { obj.maxGuests = value; } }, metadata: _metadata }, _maxGuests_initializers, _maxGuests_extraInitializers);
            __esDecorate(null, null, _totalRooms_decorators, { kind: "field", name: "totalRooms", static: false, private: false, access: { has: function (obj) { return "totalRooms" in obj; }, get: function (obj) { return obj.totalRooms; }, set: function (obj, value) { obj.totalRooms = value; } }, metadata: _metadata }, _totalRooms_initializers, _totalRooms_extraInitializers);
            __esDecorate(null, null, _available_decorators, { kind: "field", name: "available", static: false, private: false, access: { has: function (obj) { return "available" in obj; }, get: function (obj) { return obj.available; }, set: function (obj, value) { obj.available = value; } }, metadata: _metadata }, _available_initializers, _available_extraInitializers);
            __esDecorate(null, null, _amenities_decorators, { kind: "field", name: "amenities", static: false, private: false, access: { has: function (obj) { return "amenities" in obj; }, get: function (obj) { return obj.amenities; }, set: function (obj, value) { obj.amenities = value; } }, metadata: _metadata }, _amenities_initializers, _amenities_extraInitializers);
            __esDecorate(null, null, _minNights_decorators, { kind: "field", name: "minNights", static: false, private: false, access: { has: function (obj) { return "minNights" in obj; }, get: function (obj) { return obj.minNights; }, set: function (obj, value) { obj.minNights = value; } }, metadata: _metadata }, _minNights_initializers, _minNights_extraInitializers);
            __esDecorate(null, null, _taxRate_decorators, { kind: "field", name: "taxRate", static: false, private: false, access: { has: function (obj) { return "taxRate" in obj; }, get: function (obj) { return obj.taxRate; }, set: function (obj, value) { obj.taxRate = value; } }, metadata: _metadata }, _taxRate_initializers, _taxRate_extraInitializers);
            __esDecorate(null, null, _weekendMultiplier_decorators, { kind: "field", name: "weekendMultiplier", static: false, private: false, access: { has: function (obj) { return "weekendMultiplier" in obj; }, get: function (obj) { return obj.weekendMultiplier; }, set: function (obj, value) { obj.weekendMultiplier = value; } }, metadata: _metadata }, _weekendMultiplier_initializers, _weekendMultiplier_extraInitializers);
            __esDecorate(null, null, _seasonalRates_decorators, { kind: "field", name: "seasonalRates", static: false, private: false, access: { has: function (obj) { return "seasonalRates" in obj; }, get: function (obj) { return obj.seasonalRates; }, set: function (obj, value) { obj.seasonalRates = value; } }, metadata: _metadata }, _seasonalRates_initializers, _seasonalRates_extraInitializers);
            __esDecorate(null, null, _photos_decorators, { kind: "field", name: "photos", static: false, private: false, access: { has: function (obj) { return "photos" in obj; }, get: function (obj) { return obj.photos; }, set: function (obj, value) { obj.photos = value; } }, metadata: _metadata }, _photos_initializers, _photos_extraInitializers);
            __esDecorate(null, null, _businessId_decorators, { kind: "field", name: "businessId", static: false, private: false, access: { has: function (obj) { return "businessId" in obj; }, get: function (obj) { return obj.businessId; }, set: function (obj, value) { obj.businessId = value; } }, metadata: _metadata }, _businessId_initializers, _businessId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateRoomTypeDto = CreateRoomTypeDto;
