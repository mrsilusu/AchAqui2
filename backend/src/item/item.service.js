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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemService = void 0;
var common_1 = require("@nestjs/common");
var ItemService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ItemService = _classThis = /** @class */ (function () {
        function ItemService_1(prisma) {
            this.prisma = prisma;
        }
        ItemService_1.prototype.findAllByBusiness = function (businessId) {
            if (!businessId) {
                throw new common_1.BadRequestException('businessId é obrigatório.');
            }
            return this.prisma.item.findMany({
                where: { businessId: businessId },
                orderBy: { createdAt: 'desc' },
            });
        };
        ItemService_1.prototype.findOne = function (id) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item) {
                                throw new common_1.NotFoundException('Item não encontrado.');
                            }
                            return [2 /*return*/, item];
                    }
                });
            });
        };
        ItemService_1.prototype.create = function (ownerId, createItemDto) {
            return __awaiter(this, void 0, void 0, function () {
                var business;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findUnique({
                                where: { id: createItemDto.businessId },
                                select: { id: true, ownerId: true },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            }
                            if (business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode adicionar itens.');
                            }
                            return [2 /*return*/, this.prisma.item.create({
                                    data: createItemDto,
                                })];
                    }
                });
            });
        };
        ItemService_1.prototype.update = function (id, ownerId, updateItemDto) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: {
                                    business: {
                                        select: { ownerId: true },
                                    },
                                },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item) {
                                throw new common_1.NotFoundException('Item não encontrado.');
                            }
                            if (item.business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode editar itens.');
                            }
                            return [2 /*return*/, this.prisma.item.update({
                                    where: { id: id },
                                    data: updateItemDto,
                                })];
                    }
                });
            });
        };
        ItemService_1.prototype.remove = function (id, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: {
                                    business: {
                                        select: { ownerId: true },
                                    },
                                },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item) {
                                throw new common_1.NotFoundException('Item não encontrado.');
                            }
                            if (item.business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode remover itens.');
                            }
                            return [4 /*yield*/, this.prisma.item.delete({
                                    where: { id: id },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Item removido com sucesso.' }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────────────
        // MENU ITEM METHODS (Secção 2 — Menu Editor)
        // ─────────────────────────────────────────────────────
        ItemService_1.prototype.findMenuItemsByBusiness = function (businessId) {
            if (!businessId) {
                throw new common_1.BadRequestException('businessId é obrigatório.');
            }
            return this.prisma.item.findMany({
                where: {
                    businessId: businessId,
                    // In future: add itemType='MENU' filter
                },
                orderBy: { createdAt: 'desc' },
            });
        };
        ItemService_1.prototype.createMenuItem = function (ownerId, createMenuItemDto) {
            return __awaiter(this, void 0, void 0, function () {
                var business, itemData;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findUnique({
                                where: { id: createMenuItemDto.businessId },
                                select: { id: true, ownerId: true },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            }
                            if (business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode adicionar itens ao menu.');
                            }
                            itemData = {
                                name: createMenuItemDto.name,
                                description: createMenuItemDto.description || '',
                                price: createMenuItemDto.price,
                                businessId: createMenuItemDto.businessId,
                                capacity: 1, // placeholder for menu items
                                // metadata.category e .available podem ser armazenados aqui em futuro,
                                // ou adicionar coluna específica ao schema
                            };
                            return [2 /*return*/, this.prisma.item.create({
                                    data: itemData,
                                })];
                    }
                });
            });
        };
        ItemService_1.prototype.updateMenuItem = function (id, ownerId, updateMenuItemDto) {
            return __awaiter(this, void 0, void 0, function () {
                var item, dataToUpdate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: {
                                    business: {
                                        select: { ownerId: true },
                                    },
                                },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item) {
                                throw new common_1.NotFoundException('Item do menu não encontrado.');
                            }
                            if (item.business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode editar itens do menu.');
                            }
                            dataToUpdate = {};
                            if (updateMenuItemDto.name)
                                dataToUpdate.name = updateMenuItemDto.name;
                            if (updateMenuItemDto.description)
                                dataToUpdate.description = updateMenuItemDto.description;
                            if (updateMenuItemDto.price !== undefined)
                                dataToUpdate.price = updateMenuItemDto.price;
                            return [2 /*return*/, this.prisma.item.update({
                                    where: { id: id },
                                    data: dataToUpdate,
                                })];
                    }
                });
            });
        };
        ItemService_1.prototype.removeMenuItem = function (id, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: {
                                    business: {
                                        select: { ownerId: true },
                                    },
                                },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item) {
                                throw new common_1.NotFoundException('Item do menu não encontrado.');
                            }
                            if (item.business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode remover itens do menu.');
                            }
                            return [4 /*yield*/, this.prisma.item.delete({
                                    where: { id: id },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Item do menu removido com sucesso.' }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────────────
        // INVENTORY ITEM METHODS (Secção 5 — Inventory Editor)
        // ─────────────────────────────────────────────────────
        ItemService_1.prototype.findInventoryItemsByBusiness = function (businessId) {
            if (!businessId) {
                throw new common_1.BadRequestException('businessId é obrigatório.');
            }
            return this.prisma.item.findMany({
                where: {
                    businessId: businessId,
                    // In future: add itemType='INVENTORY' filter
                },
                orderBy: { createdAt: 'desc' },
            });
        };
        ItemService_1.prototype.createInventoryItem = function (ownerId, createInventoryItemDto) {
            return __awaiter(this, void 0, void 0, function () {
                var business, itemData;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findUnique({
                                where: { id: createInventoryItemDto.businessId },
                                select: { id: true, ownerId: true },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            }
                            if (business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode adicionar itens ao inventário.');
                            }
                            itemData = {
                                name: createInventoryItemDto.name,
                                description: createInventoryItemDto.category || '',
                                price: createInventoryItemDto.price,
                                businessId: createInventoryItemDto.businessId,
                                capacity: Math.floor(createInventoryItemDto.stock) || 0, // Use capacity field for stock count
                            };
                            return [2 /*return*/, this.prisma.item.create({
                                    data: itemData,
                                })];
                    }
                });
            });
        };
        ItemService_1.prototype.updateInventoryItem = function (id, ownerId, updateInventoryItemDto) {
            return __awaiter(this, void 0, void 0, function () {
                var item, dataToUpdate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: {
                                    business: {
                                        select: { ownerId: true },
                                    },
                                },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item) {
                                throw new common_1.NotFoundException('Item do inventário não encontrado.');
                            }
                            if (item.business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode editar itens do inventário.');
                            }
                            dataToUpdate = {};
                            if (updateInventoryItemDto.name)
                                dataToUpdate.name = updateInventoryItemDto.name;
                            if (updateInventoryItemDto.price !== undefined)
                                dataToUpdate.price = updateInventoryItemDto.price;
                            if (updateInventoryItemDto.stock !== undefined)
                                dataToUpdate.capacity = Math.floor(updateInventoryItemDto.stock);
                            if (updateInventoryItemDto.category)
                                dataToUpdate.description = updateInventoryItemDto.category;
                            return [2 /*return*/, this.prisma.item.update({
                                    where: { id: id },
                                    data: dataToUpdate,
                                })];
                    }
                });
            });
        };
        ItemService_1.prototype.removeInventoryItem = function (id, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: {
                                    business: {
                                        select: { ownerId: true },
                                    },
                                },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item) {
                                throw new common_1.NotFoundException('Item do inventário não encontrado.');
                            }
                            if (item.business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário do estabelecimento pode remover itens do inventário.');
                            }
                            return [4 /*yield*/, this.prisma.item.delete({
                                    where: { id: id },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Item do inventário removido com sucesso.' }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────────────
        // SERVICES METHODS (Secção 6 — Services Editor)
        // ─────────────────────────────────────────────────────
        ItemService_1.prototype.findServicesByBusiness = function (businessId) {
            if (!businessId) {
                throw new common_1.BadRequestException('businessId é obrigatório.');
            }
            return this.prisma.item.findMany({
                where: { businessId: businessId },
                orderBy: { createdAt: 'desc' },
            });
        };
        ItemService_1.prototype.createService = function (ownerId, createServiceDto) {
            return __awaiter(this, void 0, void 0, function () {
                var business;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findUnique({
                                where: { id: createServiceDto.businessId },
                                select: { id: true, ownerId: true },
                            })];
                        case 1:
                            business = _a.sent();
                            if (!business) {
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            }
                            if (business.ownerId !== ownerId) {
                                throw new common_1.ForbiddenException('Apenas o proprietário pode adicionar serviços.');
                            }
                            return [2 /*return*/, this.prisma.item.create({
                                    data: {
                                        name: createServiceDto.name,
                                        description: createServiceDto.description || createServiceDto.duration || '',
                                        price: createServiceDto.basePrice,
                                        businessId: createServiceDto.businessId,
                                        capacity: 1,
                                    },
                                })];
                    }
                });
            });
        };
        ItemService_1.prototype.updateService = function (id, ownerId, updateServiceDto) {
            return __awaiter(this, void 0, void 0, function () {
                var item, dataToUpdate;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: { business: { select: { ownerId: true } } },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item)
                                throw new common_1.NotFoundException('Serviço não encontrado.');
                            if (item.business.ownerId !== ownerId)
                                throw new common_1.ForbiddenException('Apenas o proprietário pode editar serviços.');
                            dataToUpdate = {};
                            if (updateServiceDto.name)
                                dataToUpdate.name = updateServiceDto.name;
                            if (updateServiceDto.description)
                                dataToUpdate.description = updateServiceDto.description;
                            if (updateServiceDto.basePrice !== undefined)
                                dataToUpdate.price = updateServiceDto.basePrice;
                            return [2 /*return*/, this.prisma.item.update({ where: { id: id }, data: dataToUpdate })];
                    }
                });
            });
        };
        ItemService_1.prototype.removeService = function (id, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var item;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.item.findUnique({
                                where: { id: id },
                                include: { business: { select: { ownerId: true } } },
                            })];
                        case 1:
                            item = _a.sent();
                            if (!item)
                                throw new common_1.NotFoundException('Serviço não encontrado.');
                            if (item.business.ownerId !== ownerId)
                                throw new common_1.ForbiddenException('Apenas o proprietário pode remover serviços.');
                            return [4 /*yield*/, this.prisma.item.delete({ where: { id: id } })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/, { message: 'Serviço removido com sucesso.' }];
                    }
                });
            });
        };
        // ─────────────────────────────────────────────────────
        // ROOMS METHODS (Secção 7 — Rooms Editor)
        // ─────────────────────────────────────────────────────
        // ─────────────────────────────────────────────────────────────────────────
        // ROOM TYPES — tabela dedicada room_types
        // ─────────────────────────────────────────────────────────────────────────
        // ─── Helpers HtRoom ──────────────────────────────────────────────────────
        ItemService_1.prototype.nextRoomNumber = function (businessId) {
            return __awaiter(this, void 0, void 0, function () {
                var existing, nums, max;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.htRoom.findMany({
                                where: { businessId: businessId },
                                select: { number: true },
                            })];
                        case 1:
                            existing = _a.sent();
                            nums = existing.map(function (r) { return parseInt(r.number, 10); }).filter(function (n) { return !isNaN(n); });
                            max = nums.length ? Math.max.apply(Math, nums) : 100;
                            return [2 /*return*/, String(max + 1)];
                    }
                });
            });
        };
        ItemService_1.prototype.createPhysicalRooms = function (businessId_1, roomTypeId_1, total_1) {
            return __awaiter(this, arguments, void 0, function (businessId, roomTypeId, total, floor) {
                var i, number;
                if (floor === void 0) { floor = 1; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < total)) return [3 /*break*/, 5];
                            return [4 /*yield*/, this.nextRoomNumber(businessId)];
                        case 2:
                            number = _a.sent();
                            return [4 /*yield*/, this.prisma.htRoom.create({
                                    data: { businessId: businessId, roomTypeId: roomTypeId, number: number, floor: floor, status: 'CLEAN' },
                                })];
                        case 3:
                            _a.sent();
                            _a.label = 4;
                        case 4:
                            i++;
                            return [3 /*break*/, 1];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        ItemService_1.prototype.syncPhysicalRooms = function (businessId_1, roomTypeId_1, newTotal_1) {
            return __awaiter(this, arguments, void 0, function (businessId, roomTypeId, newTotal, floor) {
                var current, diff, i, number, removable, _i, removable_1, r;
                if (floor === void 0) { floor = 1; }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.htRoom.findMany({
                                where: { businessId: businessId, roomTypeId: roomTypeId },
                                include: {
                                    bookings: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] } } },
                                },
                                orderBy: { createdAt: 'asc' },
                            })];
                        case 1:
                            current = _a.sent();
                            diff = newTotal - current.length;
                            if (!(diff > 0)) return [3 /*break*/, 7];
                            i = 0;
                            _a.label = 2;
                        case 2:
                            if (!(i < diff)) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.nextRoomNumber(businessId)];
                        case 3:
                            number = _a.sent();
                            return [4 /*yield*/, this.prisma.htRoom.create({
                                    data: { businessId: businessId, roomTypeId: roomTypeId, number: number, floor: floor, status: 'CLEAN' },
                                })];
                        case 4:
                            _a.sent();
                            _a.label = 5;
                        case 5:
                            i++;
                            return [3 /*break*/, 2];
                        case 6: return [3 /*break*/, 11];
                        case 7:
                            if (!(diff < 0)) return [3 /*break*/, 11];
                            removable = current
                                .filter(function (r) { return r.bookings.length === 0 && r.status === 'CLEAN'; })
                                .slice(0, Math.abs(diff));
                            _i = 0, removable_1 = removable;
                            _a.label = 8;
                        case 8:
                            if (!(_i < removable_1.length)) return [3 /*break*/, 11];
                            r = removable_1[_i];
                            return [4 /*yield*/, this.prisma.htRoom.delete({ where: { id: r.id } })];
                        case 9:
                            _a.sent();
                            _a.label = 10;
                        case 10:
                            _i++;
                            return [3 /*break*/, 8];
                        case 11: return [2 /*return*/];
                    }
                });
            });
        };
        ItemService_1.prototype.getRoomsByBusiness = function (businessId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    if (!businessId)
                        throw new common_1.BadRequestException('businessId é obrigatório.');
                    return [2 /*return*/, this.prisma.htRoomType.findMany({
                            where: { businessId: businessId },
                            orderBy: { createdAt: 'asc' },
                        })];
                });
            });
        };
        ItemService_1.prototype.createRoomType = function (ownerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var business, roomType, total, floor;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                return __generator(this, function (_m) {
                    switch (_m.label) {
                        case 0: return [4 /*yield*/, this.prisma.business.findUnique({
                                where: { id: dto.businessId },
                                select: { id: true, ownerId: true },
                            })];
                        case 1:
                            business = _m.sent();
                            if (!business)
                                throw new common_1.NotFoundException('Estabelecimento não encontrado.');
                            if (business.ownerId !== ownerId)
                                throw new common_1.ForbiddenException('Apenas o proprietário pode adicionar tipos de quarto.');
                            return [4 /*yield*/, this.prisma.htRoomType.create({
                                    data: {
                                        businessId: dto.businessId,
                                        name: dto.name,
                                        description: (_a = dto.description) !== null && _a !== void 0 ? _a : '',
                                        pricePerNight: dto.pricePerNight,
                                        maxGuests: (_b = dto.maxGuests) !== null && _b !== void 0 ? _b : 2,
                                        totalRooms: (_c = dto.totalRooms) !== null && _c !== void 0 ? _c : 1,
                                        available: dto.available !== false,
                                        amenities: (_d = dto.amenities) !== null && _d !== void 0 ? _d : [],
                                        minNights: (_e = dto.minNights) !== null && _e !== void 0 ? _e : 1,
                                        taxRate: (_f = dto.taxRate) !== null && _f !== void 0 ? _f : 0,
                                        weekendMultiplier: (_g = dto.weekendMultiplier) !== null && _g !== void 0 ? _g : 1.0,
                                        seasonalRates: (_h = dto.seasonalRates) !== null && _h !== void 0 ? _h : undefined,
                                        photos: (_j = dto.photos) !== null && _j !== void 0 ? _j : [],
                                    },
                                })];
                        case 2:
                            roomType = _m.sent();
                            return [2 /*return*/, roomType];
                        case 3:
                    }
                });
            });
        };
        ItemService_1.prototype.updateRoomType = function (id, ownerId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var room, data, updated;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.prisma.htRoomType.findUnique({
                                where: { id: id },
                                include: { business: { select: { ownerId: true, id: true } } },
                            })];
                        case 1:
                            room = _b.sent();
                            if (!room)
                                throw new common_1.NotFoundException('Tipo de quarto não encontrado.');
                            if (room.business.ownerId !== ownerId)
                                throw new common_1.ForbiddenException('Apenas o proprietário pode editar tipos de quarto.');
                            data = {};
                            if (dto.name !== undefined)
                                data.name = dto.name;
                            if (dto.description !== undefined)
                                data.description = dto.description;
                            if (dto.pricePerNight !== undefined)
                                data.pricePerNight = dto.pricePerNight;
                            if (dto.maxGuests !== undefined)
                                data.maxGuests = dto.maxGuests;
                            if (dto.totalRooms !== undefined)
                                data.totalRooms = dto.totalRooms;
                            if (dto.available !== undefined)
                                data.available = dto.available;
                            if (dto.amenities !== undefined)
                                data.amenities = dto.amenities;
                            if (dto.minNights !== undefined)
                                data.minNights = dto.minNights;
                            if (dto.taxRate !== undefined)
                                data.taxRate = dto.taxRate;
                            if (dto.weekendMultiplier !== undefined)
                                data.weekendMultiplier = dto.weekendMultiplier;
                            if (dto.seasonalRates !== undefined)
                                data.seasonalRates = dto.seasonalRates;
                            if (dto.photos !== undefined)
                                data.photos = dto.photos;
                            return [4 /*yield*/, this.prisma.htRoomType.update({ where: { id: id }, data: data })];
                        case 2:
                            updated = _b.sent();
                            if (!(dto.totalRooms !== undefined && dto.totalRooms !== room.totalRooms)) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.syncPhysicalRooms(room.businessId, id, dto.totalRooms, (_a = dto.floor) !== null && _a !== void 0 ? _a : 1)];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4: return [2 /*return*/, updated];
                    }
                });
            });
        };
        ItemService_1.prototype.removeRoomType = function (id, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var room;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.htRoomType.findUnique({
                                where: { id: id },
                                include: { business: { select: { ownerId: true } } },
                            })];
                        case 1:
                            room = _a.sent();
                            if (!room)
                                throw new common_1.NotFoundException('Tipo de quarto não encontrado.');
                            if (room.business.ownerId !== ownerId)
                                throw new common_1.ForbiddenException('Apenas o proprietário pode remover tipos de quarto.');
                            // Remover quartos físicos sem reservas activas
                            return [4 /*yield*/, this.prisma.htRoom.deleteMany({
                                    where: {
                                        roomTypeId: id,
                                        bookings: { none: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'PENDING'] } } },
                                    },
                                })];
                        case 2:
                            // Remover quartos físicos sem reservas activas
                            _a.sent();
                            return [4 /*yield*/, this.prisma.htRoomType.delete({ where: { id: id } })];
                        case 3:
                            _a.sent();
                            return [2 /*return*/, { message: 'Tipo de quarto e quartos físicos removidos com sucesso.' }];
                    }
                });
            });
        };
        return ItemService_1;
    }());
    __setFunctionName(_classThis, "ItemService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ItemService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ItemService = _classThis;
}();
exports.ItemService = ItemService;
