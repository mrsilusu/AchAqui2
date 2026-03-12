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
exports.ImportService = void 0;
var common_1 = require("@nestjs/common");
// ─── Serviço ──────────────────────────────────────────────────────────────────
var ImportService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ImportService = _classThis = /** @class */ (function () {
        function ImportService_1(prisma) {
            this.prisma = prisma;
        }
        // ── Parser CSV simples (sem dependências externas) ───────────────────────────
        ImportService_1.prototype.parseCSV = function (csvText) {
            var lines = csvText.split('\n').filter(function (l) { return l.trim(); });
            if (lines.length < 2)
                return [];
            var headers = this.parseCSVLine(lines[0]);
            var rows = [];
            var _loop_1 = function (i) {
                var values = this_1.parseCSVLine(lines[i]);
                if (values.length === 0)
                    return "continue";
                var row = {};
                headers.forEach(function (h, idx) {
                    var _a, _b;
                    row[h.trim()] = (_b = (_a = values[idx]) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : '';
                });
                rows.push(row);
            };
            var this_1 = this;
            for (var i = 1; i < lines.length; i++) {
                _loop_1(i);
            }
            return rows;
        };
        ImportService_1.prototype.parseCSVLine = function (line) {
            var result = [];
            var current = '';
            var inQuotes = false;
            for (var i = 0; i < line.length; i++) {
                var char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    }
                    else {
                        inQuotes = !inQuotes;
                    }
                }
                else if (char === ',' && !inQuotes) {
                    result.push(current);
                    current = '';
                }
                else {
                    current += char;
                }
            }
            result.push(current);
            return result;
        };
        // ── Mapear linha Outscraper → dados do negócio ───────────────────────────────
        ImportService_1.prototype.mapRow = function (row) {
            var _a, _b, _c, _d;
            var lat = parseFloat(String((_a = row.latitude) !== null && _a !== void 0 ? _a : ''));
            var lng = parseFloat(String((_b = row.longitude) !== null && _b !== void 0 ? _b : ''));
            if (!row.name || isNaN(lat) || isNaN(lng))
                return null;
            // Filtrar negócios fechados permanentemente
            var status = String((_c = row.business_status) !== null && _c !== void 0 ? _c : 'OPERATIONAL').toUpperCase();
            if (status === 'CLOSED_PERMANENTLY')
                return null;
            // Categoria — usa subtypes (mais específico) ou category
            var category = row.subtypes
                ? String(row.subtypes).split(',')[0].trim()
                : String((_d = row.category) !== null && _d !== void 0 ? _d : 'other').trim();
            var description = String(row.description || row.about || row.full_address || row.name).slice(0, 500);
            // Município — extrai do borough ou city
            var municipality = String(row.borough || row.city || '').trim() || null;
            // Fotos — principal + logo
            var photos = [];
            if (row.photo)
                photos.push(String(row.photo));
            if (row.logo)
                photos.push(String(row.logo));
            // Email do dono/negócio (campo owner_title às vezes tem email)
            var email = row.email
                ? String(row.email)
                : null;
            // Horários — preserva formato raw do Outscraper para parsing posterior
            var workingHours = row.working_hours || row.working_hours_old_format || null;
            // Rating e reviews
            var rating = row.rating ? parseFloat(String(row.rating)) : null;
            var reviewsCount = row.reviews ? parseInt(String(row.reviews)) : null;
            var metadata = {
                address: row.full_address || null,
                street: row.street || null,
                city: row.city || null,
                country: row.country || null,
                postalCode: row.postal_code || null,
                phone: row.phone || null,
                website: row.site || null,
                email: email,
                rating: rating,
                reviewsCount: reviewsCount,
                photos: photos, // array com photo + logo
                workingHours: workingHours, // formato raw Outscraper
                status: status, // OPERATIONAL | CLOSED_TEMPORARILY | etc.
                verified: row.verified === 'TRUE' || row.verified === true,
                placeTypes: row.type || null,
                locatedIn: row.located_in || null,
            };
            return {
                name: String(row.name).slice(0, 255),
                category: category,
                description: description || 'Sem descrição',
                latitude: lat,
                longitude: lng,
                municipality: municipality,
                isActive: status !== 'CLOSED_TEMPORARILY',
                googlePlaceId: row.place_id ? String(row.place_id) : null,
                metadata: metadata,
            };
        };
        // ── Importação principal ─────────────────────────────────────────────────────
        ImportService_1.prototype.importRows = function (rows) {
            return __awaiter(this, void 0, void 0, function () {
                var result, BATCH, i, batch;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            result = {
                                total: rows.length,
                                imported: 0,
                                updated: 0,
                                suggested: 0,
                                skipped: 0,
                                errors: 0,
                                details: { imported: [], updated: [], suggested: [], skipped: [], errored: [] },
                            };
                            BATCH = 50;
                            i = 0;
                            _a.label = 1;
                        case 1:
                            if (!(i < rows.length)) return [3 /*break*/, 4];
                            batch = rows.slice(i, i + BATCH);
                            return [4 /*yield*/, Promise.all(batch.map(function (row) { return _this.processRow(row, result); }))];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            i += BATCH;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/, result];
                    }
                });
            });
        };
        ImportService_1.prototype.processRow = function (row, result) {
            return __awaiter(this, void 0, void 0, function () {
                var mapped, existing, err_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            mapped = this.mapRow(row);
                            if (!mapped) {
                                result.skipped++;
                                result.details.skipped.push(String((_a = row.name) !== null && _a !== void 0 ? _a : 'sem nome'));
                                return [2 /*return*/];
                            }
                            _b.label = 1;
                        case 1:
                            _b.trys.push([1, 10, , 11]);
                            if (!!mapped.googlePlaceId) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.business.create({
                                    data: {
                                        name: mapped.name,
                                        category: mapped.category,
                                        description: mapped.description,
                                        latitude: mapped.latitude,
                                        longitude: mapped.longitude,
                                        municipality: mapped.municipality,
                                        isActive: mapped.isActive,
                                        metadata: mapped.metadata,
                                        source: 'GOOGLE',
                                        isClaimed: false,
                                    },
                                })];
                        case 2:
                            _b.sent();
                            result.imported++;
                            result.details.imported.push(mapped.name);
                            return [2 /*return*/];
                        case 3: return [4 /*yield*/, this.prisma.business.findUnique({
                                where: { googlePlaceId: mapped.googlePlaceId },
                            })];
                        case 4:
                            existing = _b.sent();
                            if (!!existing) return [3 /*break*/, 6];
                            // Novo negócio — importa directamente
                            return [4 /*yield*/, this.prisma.business.create({
                                    data: {
                                        name: mapped.name,
                                        category: mapped.category,
                                        description: mapped.description,
                                        latitude: mapped.latitude,
                                        longitude: mapped.longitude,
                                        municipality: mapped.municipality,
                                        isActive: mapped.isActive,
                                        metadata: mapped.metadata,
                                        source: 'GOOGLE',
                                        googlePlaceId: mapped.googlePlaceId,
                                        isClaimed: false,
                                    },
                                })];
                        case 5:
                            // Novo negócio — importa directamente
                            _b.sent();
                            result.imported++;
                            result.details.imported.push(mapped.name);
                            return [2 /*return*/];
                        case 6:
                            if (!(existing.isClaimed && existing.ownerId)) return [3 /*break*/, 8];
                            // Criar sugestão de actualização para o dono
                            return [4 /*yield*/, this.createSuggestion(existing.id, mapped, existing)];
                        case 7:
                            // Criar sugestão de actualização para o dono
                            _b.sent();
                            result.suggested++;
                            result.details.suggested.push(mapped.name);
                            return [2 /*return*/];
                        case 8: 
                        // Sem dono — actualiza directamente
                        return [4 /*yield*/, this.prisma.business.update({
                                where: { id: existing.id },
                                data: {
                                    name: mapped.name,
                                    category: mapped.category,
                                    description: mapped.description,
                                    latitude: mapped.latitude,
                                    longitude: mapped.longitude,
                                    municipality: mapped.municipality,
                                    isActive: mapped.isActive,
                                    metadata: mapped.metadata,
                                    source: 'GOOGLE',
                                },
                            })];
                        case 9:
                            // Sem dono — actualiza directamente
                            _b.sent();
                            result.updated++;
                            result.details.updated.push(mapped.name);
                            return [3 /*break*/, 11];
                        case 10:
                            err_1 = _b.sent();
                            result.errors++;
                            result.details.errored.push("".concat(mapped.name, ": ").concat(String(err_1)));
                            return [3 /*break*/, 11];
                        case 11: return [2 /*return*/];
                    }
                });
            });
        };
        // ── Criar sugestão de actualização + notificar dono ──────────────────────────
        ImportService_1.prototype.createSuggestion = function (businessId, suggested, current) {
            return __awaiter(this, void 0, void 0, function () {
                var existingSuggestion, expiresAt;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!suggested)
                                return [2 /*return*/];
                            return [4 /*yield*/, this.prisma.dataUpdateSuggestion.findFirst({
                                    where: { businessId: businessId, status: 'PENDING' },
                                })];
                        case 1:
                            existingSuggestion = _a.sent();
                            expiresAt = new Date();
                            expiresAt.setDate(expiresAt.getDate() + 30);
                            if (!existingSuggestion) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.prisma.dataUpdateSuggestion.update({
                                    where: { id: existingSuggestion.id },
                                    data: {
                                        suggestedData: suggested,
                                        expiresAt: expiresAt,
                                    },
                                })];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                        case 3: return [4 /*yield*/, this.prisma.dataUpdateSuggestion.create({
                                data: {
                                    businessId: businessId,
                                    source: 'GOOGLE',
                                    status: 'PENDING',
                                    suggestedData: suggested,
                                    currentData: {
                                        name: current.name,
                                        category: current.category,
                                        description: current.description,
                                        metadata: current.metadata,
                                    },
                                    expiresAt: expiresAt,
                                },
                            })];
                        case 4:
                            _a.sent();
                            if (!current.ownerId) return [3 /*break*/, 6];
                            return [4 /*yield*/, this.prisma.notification.create({
                                    data: {
                                        userId: current.ownerId,
                                        title: '📋 Dados actualizados disponíveis',
                                        message: "Encontr\u00E1mos dados mais recentes para \"".concat(current.name, "\". Queres aplicar as actualiza\u00E7\u00F5es?"),
                                        data: { type: 'DATA_UPDATE_SUGGESTION', businessId: businessId },
                                        isRead: false,
                                    },
                                })];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        // ── Ver sugestões pendentes (para o dono) ────────────────────────────────────
        ImportService_1.prototype.getMySuggestions = function (ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.dataUpdateSuggestion.findMany({
                            where: {
                                status: 'PENDING',
                                business: { ownerId: ownerId },
                            },
                            include: {
                                business: { select: { id: true, name: true, category: true } },
                            },
                            orderBy: { createdAt: 'desc' },
                        })];
                });
            });
        };
        // ── Responder a uma sugestão (dono aceita ou rejeita) ────────────────────────
        ImportService_1.prototype.respondToSuggestion = function (suggestionId, ownerId, decision) {
            return __awaiter(this, void 0, void 0, function () {
                var suggestion, data;
                var _a, _b, _c, _d, _e, _f;
                return __generator(this, function (_g) {
                    switch (_g.label) {
                        case 0: return [4 /*yield*/, this.prisma.dataUpdateSuggestion.findFirst({
                                where: {
                                    id: suggestionId,
                                    status: 'PENDING',
                                    business: { ownerId: ownerId },
                                },
                                include: { business: true },
                            })];
                        case 1:
                            suggestion = _g.sent();
                            if (!suggestion)
                                throw new common_1.BadRequestException('Sugestão não encontrada ou já respondida.');
                            return [4 /*yield*/, this.prisma.dataUpdateSuggestion.update({
                                    where: { id: suggestionId },
                                    data: { status: decision, reviewedAt: new Date() },
                                })];
                        case 2:
                            _g.sent();
                            if (!(decision === 'ACCEPTED')) return [3 /*break*/, 4];
                            data = suggestion.suggestedData;
                            return [4 /*yield*/, this.prisma.business.update({
                                    where: { id: suggestion.businessId },
                                    data: {
                                        name: (_a = data.name) !== null && _a !== void 0 ? _a : suggestion.business.name,
                                        category: (_b = data.category) !== null && _b !== void 0 ? _b : suggestion.business.category,
                                        description: (_c = data.description) !== null && _c !== void 0 ? _c : suggestion.business.description,
                                        latitude: (_d = data.latitude) !== null && _d !== void 0 ? _d : suggestion.business.latitude,
                                        longitude: (_e = data.longitude) !== null && _e !== void 0 ? _e : suggestion.business.longitude,
                                        metadata: (_f = data.metadata) !== null && _f !== void 0 ? _f : suggestion.business.metadata,
                                    },
                                })];
                        case 3:
                            _g.sent();
                            _g.label = 4;
                        case 4: return [2 /*return*/, { ok: true, decision: decision }];
                    }
                });
            });
        };
        // ── Estatísticas de importação para o admin ──────────────────────────────────
        ImportService_1.prototype.getImportStats = function () {
            return __awaiter(this, void 0, void 0, function () {
                var _a, totalGoogle, pendingSuggestions, acceptedSuggestions, rejectedSuggestions;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, Promise.all([
                                this.prisma.business.count({ where: { source: 'GOOGLE' } }),
                                this.prisma.dataUpdateSuggestion.count({ where: { status: 'PENDING' } }),
                                this.prisma.dataUpdateSuggestion.count({ where: { status: 'ACCEPTED' } }),
                                this.prisma.dataUpdateSuggestion.count({ where: { status: 'REJECTED' } }),
                            ])];
                        case 1:
                            _a = _b.sent(), totalGoogle = _a[0], pendingSuggestions = _a[1], acceptedSuggestions = _a[2], rejectedSuggestions = _a[3];
                            return [2 /*return*/, { totalGoogle: totalGoogle, pendingSuggestions: pendingSuggestions, acceptedSuggestions: acceptedSuggestions, rejectedSuggestions: rejectedSuggestions }];
                    }
                });
            });
        };
        return ImportService_1;
    }());
    __setFunctionName(_classThis, "ImportService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ImportService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ImportService = _classThis;
}();
exports.ImportService = ImportService;
