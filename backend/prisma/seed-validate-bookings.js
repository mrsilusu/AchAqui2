"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var testUser, testOwner, testBusiness, tableBookings, _i, tableBookings_1, booking, existing, roomBookings, _a, roomBookings_1, booking, existing, allTableBookings, allRoomBookings, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🌱 Starting database seed...');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 28, 29, 31]);
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: { email: 'test@achaqui.com' },
                        })];
                case 2:
                    testUser = _b.sent();
                    if (!!testUser) return [3 /*break*/, 4];
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: 'test@achaqui.com',
                                password: 'hashed-password-test',
                                role: 'CLIENT',
                                name: 'Test User',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        })];
                case 3:
                    testUser = _b.sent();
                    console.log('✅ Created test user:', testUser.id);
                    return [3 /*break*/, 5];
                case 4:
                    console.log('✅ Found existing test user:', testUser.id);
                    _b.label = 5;
                case 5: return [4 /*yield*/, prisma.user.findFirst({
                        where: { email: 'owner@achaqui.com' },
                    })];
                case 6:
                    testOwner = _b.sent();
                    if (!!testOwner) return [3 /*break*/, 8];
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                email: 'owner@achaqui.com',
                                password: 'hashed-password-owner',
                                role: 'OWNER',
                                name: 'Test Owner',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        })];
                case 7:
                    testOwner = _b.sent();
                    console.log('✅ Created test owner:', testOwner.id);
                    return [3 /*break*/, 9];
                case 8:
                    console.log('✅ Found existing test owner:', testOwner.id);
                    _b.label = 9;
                case 9: return [4 /*yield*/, prisma.business.findFirst({
                        where: { ownerId: testOwner.id },
                    })];
                case 10:
                    testBusiness = _b.sent();
                    if (!!testBusiness) return [3 /*break*/, 12];
                    return [4 /*yield*/, prisma.business.create({
                            data: {
                                name: 'Casa de Hóspedes Test',
                                category: 'HOSPITALITY',
                                description: 'Casa de hóspedes para testes de reservas',
                                latitude: 38.7223,
                                longitude: -9.1393,
                                ownerId: testOwner.id,
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        })];
                case 11:
                    testBusiness = _b.sent();
                    console.log('✅ Created test business:', testBusiness.id);
                    return [3 /*break*/, 13];
                case 12:
                    console.log('✅ Found existing test business:', testBusiness.id);
                    _b.label = 13;
                case 13:
                    tableBookings = [
                        {
                            id: "table-booking-1-".concat(Date.now()),
                            userId: testUser.id,
                            businessId: testBusiness.id,
                            startDate: new Date('2026-03-10T19:00:00Z'),
                            endDate: new Date('2026-03-10T21:00:00Z'),
                            status: 'PENDING',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        {
                            id: "table-booking-2-".concat(Date.now()),
                            userId: testUser.id,
                            businessId: testBusiness.id,
                            startDate: new Date('2026-03-12T12:30:00Z'),
                            endDate: new Date('2026-03-12T14:00:00Z'),
                            status: 'CONFIRMED',
                            createdAt: new Date('2026-03-08T10:00:00Z'),
                            updatedAt: new Date(),
                        },
                    ];
                    _i = 0, tableBookings_1 = tableBookings;
                    _b.label = 14;
                case 14:
                    if (!(_i < tableBookings_1.length)) return [3 /*break*/, 19];
                    booking = tableBookings_1[_i];
                    return [4 /*yield*/, prisma.diTableBooking.findUnique({
                            where: { id: booking.id },
                        })];
                case 15:
                    existing = _b.sent();
                    if (!!existing) return [3 /*break*/, 17];
                    return [4 /*yield*/, prisma.diTableBooking.create({ data: booking })];
                case 16:
                    _b.sent();
                    console.log('✅ Created table booking:', booking.id);
                    return [3 /*break*/, 18];
                case 17:
                    console.log('⏭️  Table booking already exists:', booking.id);
                    _b.label = 18;
                case 18:
                    _i++;
                    return [3 /*break*/, 14];
                case 19:
                    roomBookings = [
                        {
                            id: "room-booking-1-".concat(Date.now()),
                            userId: testUser.id,
                            businessId: testBusiness.id,
                            startDate: new Date('2026-03-15T14:00:00Z'),
                            endDate: new Date('2026-03-18T11:00:00Z'),
                            status: 'PENDING',
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        },
                        {
                            id: "room-booking-2-".concat(Date.now()),
                            userId: testUser.id,
                            businessId: testBusiness.id,
                            startDate: new Date('2026-03-20T15:00:00Z'),
                            endDate: new Date('2026-03-22T11:00:00Z'),
                            status: 'CONFIRMED',
                            createdAt: new Date('2026-03-09T08:30:00Z'),
                            updatedAt: new Date(),
                        },
                    ];
                    _a = 0, roomBookings_1 = roomBookings;
                    _b.label = 20;
                case 20:
                    if (!(_a < roomBookings_1.length)) return [3 /*break*/, 25];
                    booking = roomBookings_1[_a];
                    return [4 /*yield*/, prisma.htRoomBooking.findUnique({
                            where: { id: booking.id },
                        })];
                case 21:
                    existing = _b.sent();
                    if (!!existing) return [3 /*break*/, 23];
                    return [4 /*yield*/, prisma.htRoomBooking.create({ data: booking })];
                case 22:
                    _b.sent();
                    console.log('✅ Created room booking:', booking.id);
                    return [3 /*break*/, 24];
                case 23:
                    console.log('⏭️  Room booking already exists:', booking.id);
                    _b.label = 24;
                case 24:
                    _a++;
                    return [3 /*break*/, 20];
                case 25:
                    // Verify dual-table query works
                    console.log('\n📊 Verification Query Results:');
                    return [4 /*yield*/, prisma.diTableBooking.findMany({
                            where: { businessId: testBusiness.id },
                        })];
                case 26:
                    allTableBookings = _b.sent();
                    console.log("\uD83D\uDCCC Table bookings found: ".concat(allTableBookings.length));
                    return [4 /*yield*/, prisma.htRoomBooking.findMany({
                            where: { businessId: testBusiness.id },
                        })];
                case 27:
                    allRoomBookings = _b.sent();
                    console.log("\uD83D\uDEAA Room bookings found: ".concat(allRoomBookings.length));
                    console.log('\n✨ Seed completed successfully!');
                    return [3 /*break*/, 31];
                case 28:
                    error_1 = _b.sent();
                    console.error('❌ Seed error:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 31];
                case 29: return [4 /*yield*/, prisma.$disconnect()];
                case 30:
                    _b.sent();
                    return [7 /*endfinally*/];
                case 31: return [2 /*return*/];
            }
        });
    });
}
main();
