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
exports.CreateBookingDto = exports.BookingTypeDto = void 0;
var client_1 = require("@prisma/client");
var class_validator_1 = require("class-validator");
var BookingTypeDto;
(function (BookingTypeDto) {
    BookingTypeDto["TABLE"] = "TABLE";
    BookingTypeDto["ROOM"] = "ROOM";
})(BookingTypeDto || (exports.BookingTypeDto = BookingTypeDto = {}));
var CreateBookingDto = function () {
    var _a;
    var _startDate_decorators;
    var _startDate_initializers = [];
    var _startDate_extraInitializers = [];
    var _endDate_decorators;
    var _endDate_initializers = [];
    var _endDate_extraInitializers = [];
    var _businessId_decorators;
    var _businessId_initializers = [];
    var _businessId_extraInitializers = [];
    var _status_decorators;
    var _status_initializers = [];
    var _status_extraInitializers = [];
    var _bookingType_decorators;
    var _bookingType_initializers = [];
    var _bookingType_extraInitializers = [];
    var _guestName_decorators;
    var _guestName_initializers = [];
    var _guestName_extraInitializers = [];
    var _guestPhone_decorators;
    var _guestPhone_initializers = [];
    var _guestPhone_extraInitializers = [];
    var _adults_decorators;
    var _adults_initializers = [];
    var _adults_extraInitializers = [];
    var _children_decorators;
    var _children_initializers = [];
    var _children_extraInitializers = [];
    var _rooms_decorators;
    var _rooms_initializers = [];
    var _rooms_extraInitializers = [];
    var _totalPrice_decorators;
    var _totalPrice_initializers = [];
    var _totalPrice_extraInitializers = [];
    var _notes_decorators;
    var _notes_initializers = [];
    var _notes_extraInitializers = [];
    var _roomTypeId_decorators;
    var _roomTypeId_initializers = [];
    var _roomTypeId_extraInitializers = [];
    return _a = /** @class */ (function () {
            function CreateBookingDto() {
                this.startDate = __runInitializers(this, _startDate_initializers, void 0);
                this.endDate = (__runInitializers(this, _startDate_extraInitializers), __runInitializers(this, _endDate_initializers, void 0));
                this.businessId = (__runInitializers(this, _endDate_extraInitializers), __runInitializers(this, _businessId_initializers, void 0));
                this.status = (__runInitializers(this, _businessId_extraInitializers), __runInitializers(this, _status_initializers, void 0));
                this.bookingType = (__runInitializers(this, _status_extraInitializers), __runInitializers(this, _bookingType_initializers, void 0));
                this.guestName = (__runInitializers(this, _bookingType_extraInitializers), __runInitializers(this, _guestName_initializers, void 0));
                this.guestPhone = (__runInitializers(this, _guestName_extraInitializers), __runInitializers(this, _guestPhone_initializers, void 0));
                this.adults = (__runInitializers(this, _guestPhone_extraInitializers), __runInitializers(this, _adults_initializers, void 0));
                this.children = (__runInitializers(this, _adults_extraInitializers), __runInitializers(this, _children_initializers, void 0));
                this.rooms = (__runInitializers(this, _children_extraInitializers), __runInitializers(this, _rooms_initializers, void 0));
                this.totalPrice = (__runInitializers(this, _rooms_extraInitializers), __runInitializers(this, _totalPrice_initializers, void 0));
                this.notes = (__runInitializers(this, _totalPrice_extraInitializers), __runInitializers(this, _notes_initializers, void 0));
                this.roomTypeId = (__runInitializers(this, _notes_extraInitializers), __runInitializers(this, _roomTypeId_initializers, void 0));
                __runInitializers(this, _roomTypeId_extraInitializers);
            }
            return CreateBookingDto;
        }()),
        (function () {
            var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _startDate_decorators = [(0, class_validator_1.IsDateString)()];
            _endDate_decorators = [(0, class_validator_1.IsDateString)()];
            _businessId_decorators = [(0, class_validator_1.IsUUID)()];
            _status_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsEnum)(client_1.HtBookingStatus)];
            _bookingType_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsEnum)(BookingTypeDto)];
            _guestName_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _guestPhone_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _adults_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _children_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _rooms_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _totalPrice_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsNumber)()];
            _notes_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            _roomTypeId_decorators = [(0, class_validator_1.IsOptional)(), (0, class_validator_1.IsString)()];
            __esDecorate(null, null, _startDate_decorators, { kind: "field", name: "startDate", static: false, private: false, access: { has: function (obj) { return "startDate" in obj; }, get: function (obj) { return obj.startDate; }, set: function (obj, value) { obj.startDate = value; } }, metadata: _metadata }, _startDate_initializers, _startDate_extraInitializers);
            __esDecorate(null, null, _endDate_decorators, { kind: "field", name: "endDate", static: false, private: false, access: { has: function (obj) { return "endDate" in obj; }, get: function (obj) { return obj.endDate; }, set: function (obj, value) { obj.endDate = value; } }, metadata: _metadata }, _endDate_initializers, _endDate_extraInitializers);
            __esDecorate(null, null, _businessId_decorators, { kind: "field", name: "businessId", static: false, private: false, access: { has: function (obj) { return "businessId" in obj; }, get: function (obj) { return obj.businessId; }, set: function (obj, value) { obj.businessId = value; } }, metadata: _metadata }, _businessId_initializers, _businessId_extraInitializers);
            __esDecorate(null, null, _status_decorators, { kind: "field", name: "status", static: false, private: false, access: { has: function (obj) { return "status" in obj; }, get: function (obj) { return obj.status; }, set: function (obj, value) { obj.status = value; } }, metadata: _metadata }, _status_initializers, _status_extraInitializers);
            __esDecorate(null, null, _bookingType_decorators, { kind: "field", name: "bookingType", static: false, private: false, access: { has: function (obj) { return "bookingType" in obj; }, get: function (obj) { return obj.bookingType; }, set: function (obj, value) { obj.bookingType = value; } }, metadata: _metadata }, _bookingType_initializers, _bookingType_extraInitializers);
            __esDecorate(null, null, _guestName_decorators, { kind: "field", name: "guestName", static: false, private: false, access: { has: function (obj) { return "guestName" in obj; }, get: function (obj) { return obj.guestName; }, set: function (obj, value) { obj.guestName = value; } }, metadata: _metadata }, _guestName_initializers, _guestName_extraInitializers);
            __esDecorate(null, null, _guestPhone_decorators, { kind: "field", name: "guestPhone", static: false, private: false, access: { has: function (obj) { return "guestPhone" in obj; }, get: function (obj) { return obj.guestPhone; }, set: function (obj, value) { obj.guestPhone = value; } }, metadata: _metadata }, _guestPhone_initializers, _guestPhone_extraInitializers);
            __esDecorate(null, null, _adults_decorators, { kind: "field", name: "adults", static: false, private: false, access: { has: function (obj) { return "adults" in obj; }, get: function (obj) { return obj.adults; }, set: function (obj, value) { obj.adults = value; } }, metadata: _metadata }, _adults_initializers, _adults_extraInitializers);
            __esDecorate(null, null, _children_decorators, { kind: "field", name: "children", static: false, private: false, access: { has: function (obj) { return "children" in obj; }, get: function (obj) { return obj.children; }, set: function (obj, value) { obj.children = value; } }, metadata: _metadata }, _children_initializers, _children_extraInitializers);
            __esDecorate(null, null, _rooms_decorators, { kind: "field", name: "rooms", static: false, private: false, access: { has: function (obj) { return "rooms" in obj; }, get: function (obj) { return obj.rooms; }, set: function (obj, value) { obj.rooms = value; } }, metadata: _metadata }, _rooms_initializers, _rooms_extraInitializers);
            __esDecorate(null, null, _totalPrice_decorators, { kind: "field", name: "totalPrice", static: false, private: false, access: { has: function (obj) { return "totalPrice" in obj; }, get: function (obj) { return obj.totalPrice; }, set: function (obj, value) { obj.totalPrice = value; } }, metadata: _metadata }, _totalPrice_initializers, _totalPrice_extraInitializers);
            __esDecorate(null, null, _notes_decorators, { kind: "field", name: "notes", static: false, private: false, access: { has: function (obj) { return "notes" in obj; }, get: function (obj) { return obj.notes; }, set: function (obj, value) { obj.notes = value; } }, metadata: _metadata }, _notes_initializers, _notes_extraInitializers);
            __esDecorate(null, null, _roomTypeId_decorators, { kind: "field", name: "roomTypeId", static: false, private: false, access: { has: function (obj) { return "roomTypeId" in obj; }, get: function (obj) { return obj.roomTypeId; }, set: function (obj, value) { obj.roomTypeId = value; } }, metadata: _metadata }, _roomTypeId_initializers, _roomTypeId_extraInitializers);
            if (_metadata) Object.defineProperty(_a, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        })(),
        _a;
}();
exports.CreateBookingDto = CreateBookingDto;
