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
exports.ItemController = void 0;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var public_decorator_1 = require("../auth/decorators/public.decorator");
var roles_decorator_1 = require("../auth/decorators/roles.decorator");
var ItemController = function () {
    var _classDecorators = [(0, common_1.Controller)('items')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _findAllByBusiness_decorators;
    var _findOne_decorators;
    var _create_decorators;
    var _update_decorators;
    var _remove_decorators;
    var _findMenuItemsByBusiness_decorators;
    var _createMenuItem_decorators;
    var _updateMenuItem_decorators;
    var _removeMenuItem_decorators;
    var _findInventoryItemsByBusiness_decorators;
    var _createInventoryItem_decorators;
    var _updateInventoryItem_decorators;
    var _removeInventoryItem_decorators;
    var _findServicesByBusiness_decorators;
    var _createService_decorators;
    var _updateService_decorators;
    var _removeService_decorators;
    var _findRoomsByBusiness_decorators;
    var _createRoomType_decorators;
    var _updateRoomType_decorators;
    var _removeRoomType_decorators;
    var ItemController = _classThis = /** @class */ (function () {
        function ItemController_1(itemService) {
            this.itemService = (__runInitializers(this, _instanceExtraInitializers), itemService);
        }
        ItemController_1.prototype.findAllByBusiness = function (businessId) {
            return this.itemService.findAllByBusiness(businessId);
        };
        ItemController_1.prototype.findOne = function (id) {
            return this.itemService.findOne(id);
        };
        ItemController_1.prototype.create = function (req, createItemDto) {
            return this.itemService.create(req.user.userId, createItemDto);
        };
        ItemController_1.prototype.update = function (id, req, updateItemDto) {
            return this.itemService.update(id, req.user.userId, updateItemDto);
        };
        ItemController_1.prototype.remove = function (id, req) {
            return this.itemService.remove(id, req.user.userId);
        };
        // ─────────────────────────────────────────────────────
        // MENU ITEMS ENDPOINTS (Secção 2 — Menu Editor)
        // ─────────────────────────────────────────────────────
        ItemController_1.prototype.findMenuItemsByBusiness = function (businessId) {
            return this.itemService.findMenuItemsByBusiness(businessId);
        };
        ItemController_1.prototype.createMenuItem = function (req, createMenuItemDto) {
            return this.itemService.createMenuItem(req.user.userId, createMenuItemDto);
        };
        ItemController_1.prototype.updateMenuItem = function (id, req, updateMenuItemDto) {
            return this.itemService.updateMenuItem(id, req.user.userId, updateMenuItemDto);
        };
        ItemController_1.prototype.removeMenuItem = function (id, req) {
            return this.itemService.removeMenuItem(id, req.user.userId);
        };
        // ─────────────────────────────────────────────────────
        // INVENTORY ITEMS ENDPOINTS (Secção 5 — Inventory Editor)
        // ─────────────────────────────────────────────────────
        ItemController_1.prototype.findInventoryItemsByBusiness = function (businessId) {
            return this.itemService.findInventoryItemsByBusiness(businessId);
        };
        ItemController_1.prototype.createInventoryItem = function (req, createInventoryItemDto) {
            return this.itemService.createInventoryItem(req.user.userId, createInventoryItemDto);
        };
        ItemController_1.prototype.updateInventoryItem = function (id, req, updateInventoryItemDto) {
            return this.itemService.updateInventoryItem(id, req.user.userId, updateInventoryItemDto);
        };
        ItemController_1.prototype.removeInventoryItem = function (id, req) {
            return this.itemService.removeInventoryItem(id, req.user.userId);
        };
        // ─────────────────────────────────────────────────────
        // SERVICES ENDPOINTS (Secção 6 — Services Editor)
        // ─────────────────────────────────────────────────────
        ItemController_1.prototype.findServicesByBusiness = function (businessId) {
            return this.itemService.findServicesByBusiness(businessId);
        };
        ItemController_1.prototype.createService = function (req, createServiceDto) {
            return this.itemService.createService(req.user.userId, createServiceDto);
        };
        ItemController_1.prototype.updateService = function (id, req, updateServiceDto) {
            return this.itemService.updateService(id, req.user.userId, updateServiceDto);
        };
        ItemController_1.prototype.removeService = function (id, req) {
            return this.itemService.removeService(id, req.user.userId);
        };
        // ─────────────────────────────────────────────────────
        // ROOM TYPES ENDPOINTS — tabela dedicada room_types
        // ─────────────────────────────────────────────────────
        ItemController_1.prototype.findRoomsByBusiness = function (businessId) {
            return this.itemService.getRoomsByBusiness(businessId);
        };
        ItemController_1.prototype.createRoomType = function (req, dto) {
            return this.itemService.createRoomType(req.user.userId, dto);
        };
        ItemController_1.prototype.updateRoomType = function (id, req, dto) {
            return this.itemService.updateRoomType(id, req.user.userId, dto);
        };
        ItemController_1.prototype.removeRoomType = function (id, req) {
            return this.itemService.removeRoomType(id, req.user.userId);
        };
        return ItemController_1;
    }());
    __setFunctionName(_classThis, "ItemController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _findAllByBusiness_decorators = [(0, common_1.Get)(), (0, public_decorator_1.Public)()];
        _findOne_decorators = [(0, common_1.Get)(':id'), (0, public_decorator_1.Public)()];
        _create_decorators = [(0, common_1.Post)(), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _update_decorators = [(0, common_1.Patch)(':id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _remove_decorators = [(0, common_1.Delete)(':id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _findMenuItemsByBusiness_decorators = [(0, common_1.Get)('menu/by-business'), (0, public_decorator_1.Public)()];
        _createMenuItem_decorators = [(0, common_1.Post)('menu'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _updateMenuItem_decorators = [(0, common_1.Patch)('menu/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _removeMenuItem_decorators = [(0, common_1.Delete)('menu/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _findInventoryItemsByBusiness_decorators = [(0, common_1.Get)('inventory/by-business'), (0, public_decorator_1.Public)()];
        _createInventoryItem_decorators = [(0, common_1.Post)('inventory'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _updateInventoryItem_decorators = [(0, common_1.Patch)('inventory/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _removeInventoryItem_decorators = [(0, common_1.Delete)('inventory/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _findServicesByBusiness_decorators = [(0, common_1.Get)('services/by-business'), (0, public_decorator_1.Public)()];
        _createService_decorators = [(0, common_1.Post)('services'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _updateService_decorators = [(0, common_1.Patch)('services/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _removeService_decorators = [(0, common_1.Delete)('services/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _findRoomsByBusiness_decorators = [(0, common_1.Get)('rooms/by-business'), (0, public_decorator_1.Public)()];
        _createRoomType_decorators = [(0, common_1.Post)('rooms'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _updateRoomType_decorators = [(0, common_1.Patch)('rooms/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        _removeRoomType_decorators = [(0, common_1.Delete)('rooms/:id'), (0, roles_decorator_1.Roles)(client_1.UserRole.OWNER)];
        __esDecorate(_classThis, null, _findAllByBusiness_decorators, { kind: "method", name: "findAllByBusiness", static: false, private: false, access: { has: function (obj) { return "findAllByBusiness" in obj; }, get: function (obj) { return obj.findAllByBusiness; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findOne_decorators, { kind: "method", name: "findOne", static: false, private: false, access: { has: function (obj) { return "findOne" in obj; }, get: function (obj) { return obj.findOne; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _create_decorators, { kind: "method", name: "create", static: false, private: false, access: { has: function (obj) { return "create" in obj; }, get: function (obj) { return obj.create; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _update_decorators, { kind: "method", name: "update", static: false, private: false, access: { has: function (obj) { return "update" in obj; }, get: function (obj) { return obj.update; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _remove_decorators, { kind: "method", name: "remove", static: false, private: false, access: { has: function (obj) { return "remove" in obj; }, get: function (obj) { return obj.remove; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findMenuItemsByBusiness_decorators, { kind: "method", name: "findMenuItemsByBusiness", static: false, private: false, access: { has: function (obj) { return "findMenuItemsByBusiness" in obj; }, get: function (obj) { return obj.findMenuItemsByBusiness; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createMenuItem_decorators, { kind: "method", name: "createMenuItem", static: false, private: false, access: { has: function (obj) { return "createMenuItem" in obj; }, get: function (obj) { return obj.createMenuItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateMenuItem_decorators, { kind: "method", name: "updateMenuItem", static: false, private: false, access: { has: function (obj) { return "updateMenuItem" in obj; }, get: function (obj) { return obj.updateMenuItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeMenuItem_decorators, { kind: "method", name: "removeMenuItem", static: false, private: false, access: { has: function (obj) { return "removeMenuItem" in obj; }, get: function (obj) { return obj.removeMenuItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findInventoryItemsByBusiness_decorators, { kind: "method", name: "findInventoryItemsByBusiness", static: false, private: false, access: { has: function (obj) { return "findInventoryItemsByBusiness" in obj; }, get: function (obj) { return obj.findInventoryItemsByBusiness; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createInventoryItem_decorators, { kind: "method", name: "createInventoryItem", static: false, private: false, access: { has: function (obj) { return "createInventoryItem" in obj; }, get: function (obj) { return obj.createInventoryItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateInventoryItem_decorators, { kind: "method", name: "updateInventoryItem", static: false, private: false, access: { has: function (obj) { return "updateInventoryItem" in obj; }, get: function (obj) { return obj.updateInventoryItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeInventoryItem_decorators, { kind: "method", name: "removeInventoryItem", static: false, private: false, access: { has: function (obj) { return "removeInventoryItem" in obj; }, get: function (obj) { return obj.removeInventoryItem; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findServicesByBusiness_decorators, { kind: "method", name: "findServicesByBusiness", static: false, private: false, access: { has: function (obj) { return "findServicesByBusiness" in obj; }, get: function (obj) { return obj.findServicesByBusiness; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createService_decorators, { kind: "method", name: "createService", static: false, private: false, access: { has: function (obj) { return "createService" in obj; }, get: function (obj) { return obj.createService; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateService_decorators, { kind: "method", name: "updateService", static: false, private: false, access: { has: function (obj) { return "updateService" in obj; }, get: function (obj) { return obj.updateService; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeService_decorators, { kind: "method", name: "removeService", static: false, private: false, access: { has: function (obj) { return "removeService" in obj; }, get: function (obj) { return obj.removeService; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _findRoomsByBusiness_decorators, { kind: "method", name: "findRoomsByBusiness", static: false, private: false, access: { has: function (obj) { return "findRoomsByBusiness" in obj; }, get: function (obj) { return obj.findRoomsByBusiness; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createRoomType_decorators, { kind: "method", name: "createRoomType", static: false, private: false, access: { has: function (obj) { return "createRoomType" in obj; }, get: function (obj) { return obj.createRoomType; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateRoomType_decorators, { kind: "method", name: "updateRoomType", static: false, private: false, access: { has: function (obj) { return "updateRoomType" in obj; }, get: function (obj) { return obj.updateRoomType; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeRoomType_decorators, { kind: "method", name: "removeRoomType", static: false, private: false, access: { has: function (obj) { return "removeRoomType" in obj; }, get: function (obj) { return obj.removeRoomType; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ItemController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ItemController = _classThis;
}();
exports.ItemController = ItemController;
