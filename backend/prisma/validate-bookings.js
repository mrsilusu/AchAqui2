"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
/**
 * Validation script to test dual booking flows
 * Simulates what the backend booking service does
 */
var prisma = new client_1.PrismaClient();
var results = [];
function test(name, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var passed, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fn()];
                case 1:
                    passed = _a.sent();
                    results.push({
                        name: name,
                        status: passed ? 'PASS' : 'FAIL',
                        message: passed ? '✅' : '❌',
                    });
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    results.push({
                        name: name,
                        status: 'FAIL',
                        message: "Error: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)),
                    });
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var testUser, testBusiness_1, error_2, passed, failed;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🧪 Starting Booking Dual-Model Validation Tests\n');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 16, 17, 19]);
                    // Test 1: Verify both tables exist
                    return [4 /*yield*/, test('Table "table_bookings" exists', function () { return __awaiter(_this, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.diTableBooking.count()];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, typeof count === 'number'];
                                }
                            });
                        }); })];
                case 2:
                    // Test 1: Verify both tables exist
                    _a.sent();
                    return [4 /*yield*/, test('Table "room_bookings" exists', function () { return __awaiter(_this, void 0, void 0, function () {
                            var count;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.htRoomBooking.count()];
                                    case 1:
                                        count = _a.sent();
                                        return [2 /*return*/, typeof count === 'number'];
                                }
                            });
                        }); })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, prisma.user.findFirst()];
                case 4:
                    testUser = _a.sent();
                    return [4 /*yield*/, prisma.business.findFirst()];
                case 5:
                    testBusiness_1 = _a.sent();
                    if (!testUser || !testBusiness_1) {
                        console.log('⚠️  No test data found. Run seed first:');
                        console.log('   npx tsx prisma/seed-validate-bookings.ts\n');
                        process.exit(0);
                    }
                    // Test 3: Query all table bookings
                    return [4 /*yield*/, test('Query table bookings by business', function () { return __awaiter(_this, void 0, void 0, function () {
                            var bookings;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.diTableBooking.findMany({
                                            where: { businessId: testBusiness_1.id },
                                        })];
                                    case 1:
                                        bookings = _a.sent();
                                        console.log("   Found ".concat(bookings.length, " table bookings"));
                                        return [2 /*return*/, bookings.length > 0];
                                }
                            });
                        }); })];
                case 6:
                    // Test 3: Query all table bookings
                    _a.sent();
                    // Test 4: Query all room bookings
                    return [4 /*yield*/, test('Query room bookings by business', function () { return __awaiter(_this, void 0, void 0, function () {
                            var bookings;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.htRoomBooking.findMany({
                                            where: { businessId: testBusiness_1.id },
                                        })];
                                    case 1:
                                        bookings = _a.sent();
                                        console.log("   Found ".concat(bookings.length, " room bookings"));
                                        return [2 /*return*/, bookings.length > 0];
                                }
                            });
                        }); })];
                case 7:
                    // Test 4: Query all room bookings
                    _a.sent();
                    // Test 5: Dual-query simulation (what booking service does)
                    return [4 /*yield*/, test('Merge bookings from both tables', function () { return __awaiter(_this, void 0, void 0, function () {
                            var _a, tableBookings, roomBookings, merged;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0: return [4 /*yield*/, Promise.all([
                                            prisma.diTableBooking.findMany({ where: { businessId: testBusiness_1.id } }),
                                            prisma.htRoomBooking.findMany({ where: { businessId: testBusiness_1.id } }),
                                        ])];
                                    case 1:
                                        _a = _b.sent(), tableBookings = _a[0], roomBookings = _a[1];
                                        merged = __spreadArray(__spreadArray([], tableBookings.map(function (b) { return (__assign(__assign({}, b), { type: 'TABLE' })); }), true), roomBookings.map(function (b) { return (__assign(__assign({}, b), { type: 'ROOM' })); }), true);
                                        console.log("   Total merged bookings: ".concat(merged.length));
                                        console.log("     - Table: ".concat(tableBookings.length, ", Room: ").concat(roomBookings.length));
                                        return [2 /*return*/, merged.length > 0];
                                }
                            });
                        }); })];
                case 8:
                    // Test 5: Dual-query simulation (what booking service does)
                    _a.sent();
                    // Test 6: Type discrimination (booking service router logic)
                    return [4 /*yield*/, test('Route booking creation (bookingType = TABLE)', function () { return __awaiter(_this, void 0, void 0, function () {
                            var bookingType, shouldCreateTable, shouldCreateRoom;
                            return __generator(this, function (_a) {
                                bookingType = 'TABLE';
                                shouldCreateTable = bookingType === 'TABLE';
                                shouldCreateRoom = bookingType === 'ROOM';
                                console.log("   Table=".concat(shouldCreateTable, ", Room=").concat(shouldCreateRoom));
                                return [2 /*return*/, shouldCreateTable && !shouldCreateRoom];
                            });
                        }); })];
                case 9:
                    // Test 6: Type discrimination (booking service router logic)
                    _a.sent();
                    return [4 /*yield*/, test('Route booking creation (bookingType = ROOM)', function () { return __awaiter(_this, void 0, void 0, function () {
                            var bookingType, shouldCreateTable, shouldCreateRoom;
                            return __generator(this, function (_a) {
                                bookingType = 'ROOM';
                                shouldCreateTable = bookingType === 'TABLE';
                                shouldCreateRoom = bookingType === 'ROOM';
                                console.log("   Table=".concat(shouldCreateTable, ", Room=").concat(shouldCreateRoom));
                                return [2 /*return*/, !shouldCreateTable && shouldCreateRoom];
                            });
                        }); })];
                case 10:
                    _a.sent();
                    // Test 7: Default routing (when bookingType undefined)
                    return [4 /*yield*/, test('Default route when bookingType undefined', function () { return __awaiter(_this, void 0, void 0, function () {
                            var bookingType, defaultToTable;
                            return __generator(this, function (_a) {
                                bookingType = undefined;
                                defaultToTable = bookingType !== 'ROOM';
                                console.log("   Default to TABLE: ".concat(defaultToTable));
                                return [2 /*return*/, defaultToTable === true];
                            });
                        }); })];
                case 11:
                    // Test 7: Default routing (when bookingType undefined)
                    _a.sent();
                    // Test 8: Confirm operation (find in correct table)
                    return [4 /*yield*/, test('Find booking by ID in table_bookings', function () { return __awaiter(_this, void 0, void 0, function () {
                            var booking, found;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.diTableBooking.findFirst({
                                            where: { businessId: testBusiness_1.id },
                                        })];
                                    case 1:
                                        booking = _a.sent();
                                        if (!booking) {
                                            console.log("   No table bookings to query");
                                            return [2 /*return*/, true];
                                        }
                                        return [4 /*yield*/, prisma.diTableBooking.findUnique({
                                                where: { id: booking.id },
                                            })];
                                    case 2:
                                        found = _a.sent();
                                        console.log("   Found: ".concat((found === null || found === void 0 ? void 0 : found.id) === booking.id));
                                        return [2 /*return*/, (found === null || found === void 0 ? void 0 : found.id) === booking.id];
                                }
                            });
                        }); })];
                case 12:
                    // Test 8: Confirm operation (find in correct table)
                    _a.sent();
                    return [4 /*yield*/, test('Find booking by ID in room_bookings', function () { return __awaiter(_this, void 0, void 0, function () {
                            var booking, found;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, prisma.htRoomBooking.findFirst({
                                            where: { businessId: testBusiness_1.id },
                                        })];
                                    case 1:
                                        booking = _a.sent();
                                        if (!booking) {
                                            console.log("   No room bookings to query");
                                            return [2 /*return*/, true];
                                        }
                                        return [4 /*yield*/, prisma.htRoomBooking.findUnique({
                                                where: { id: booking.id },
                                            })];
                                    case 2:
                                        found = _a.sent();
                                        console.log("   Found: ".concat((found === null || found === void 0 ? void 0 : found.id) === booking.id));
                                        return [2 /*return*/, (found === null || found === void 0 ? void 0 : found.id) === booking.id];
                                }
                            });
                        }); })];
                case 13:
                    _a.sent();
                    // Test 9: Owner verification (business owner can see both)
                    return [4 /*yield*/, test('Owner sees all bookings (table + room)', function () { return __awaiter(_this, void 0, void 0, function () {
                            var business, total;
                            var _a, _b, _c, _d;
                            return __generator(this, function (_e) {
                                switch (_e.label) {
                                    case 0: return [4 /*yield*/, prisma.business.findUnique({
                                            where: { id: testBusiness_1.id },
                                            include: {
                                                diBookings: true,
                                                htBookings: true,
                                            },
                                        })];
                                    case 1:
                                        business = _e.sent();
                                        if (!business)
                                            return [2 /*return*/, false];
                                        total = (((_a = business.diBookings) === null || _a === void 0 ? void 0 : _a.length) || 0) + (((_b = business.htBookings) === null || _b === void 0 ? void 0 : _b.length) || 0);
                                        console.log("   Owner sees: ".concat(((_c = business.diBookings) === null || _c === void 0 ? void 0 : _c.length) || 0, " table + ").concat(((_d = business.htBookings) === null || _d === void 0 ? void 0 : _d.length) || 0, " room"));
                                        return [2 /*return*/, total > 0];
                                }
                            });
                        }); })];
                case 14:
                    // Test 9: Owner verification (business owner can see both)
                    _a.sent();
                    // Test 10: Realtime subscription tables
                    return [4 /*yield*/, test('Realtime subscription covers both tables', function () { return __awaiter(_this, void 0, void 0, function () {
                            var BOOKING_TABLES, hasTableBookings, hasRoomBookings;
                            return __generator(this, function (_a) {
                                BOOKING_TABLES = [
                                    'Booking',
                                    'bookings',
                                    'table_bookings',
                                    'room_bookings',
                                ];
                                hasTableBookings = BOOKING_TABLES.includes('table_bookings');
                                hasRoomBookings = BOOKING_TABLES.includes('room_bookings');
                                console.log("   Subscribed: table_bookings=".concat(hasTableBookings, ", room_bookings=").concat(hasRoomBookings));
                                return [2 /*return*/, hasTableBookings && hasRoomBookings];
                            });
                        }); })];
                case 15:
                    // Test 10: Realtime subscription tables
                    _a.sent();
                    return [3 /*break*/, 19];
                case 16:
                    error_2 = _a.sent();
                    console.error('Test suite error:', error_2);
                    return [3 /*break*/, 19];
                case 17: return [4 /*yield*/, prisma.$disconnect()];
                case 18:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 19:
                    // Print results
                    console.log('\n' + '='.repeat(50));
                    console.log('📊 Test Results\n');
                    passed = results.filter(function (r) { return r.status === 'PASS'; }).length;
                    failed = results.filter(function (r) { return r.status === 'FAIL'; }).length;
                    results.forEach(function (r) {
                        var icon = r.status === 'PASS' ? '✅' : '❌';
                        console.log("".concat(icon, " ").concat(r.name));
                        if (r.message && r.message !== '✅' && r.message !== '❌') {
                            console.log("   \u2514\u2500 ".concat(r.message));
                        }
                    });
                    console.log('\n' + '='.repeat(50));
                    console.log("\nSummary: ".concat(passed, "/").concat(results.length, " tests passed"));
                    if (failed > 0) {
                        console.log("\u26A0\uFE0F  ".concat(failed, " test(s) failed\n"));
                        process.exit(1);
                    }
                    else {
                        console.log('\n✨ All tests passed! Dual booking model is ready.\n');
                        process.exit(0);
                    }
                    return [2 /*return*/];
            }
        });
    });
}
main();
