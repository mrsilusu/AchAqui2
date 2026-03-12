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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
var common_1 = require("@nestjs/common");
var config_1 = require("@nestjs/config");
var core_1 = require("@nestjs/core");
var throttler_1 = require("@nestjs/throttler");
var path_1 = require("path");
var app_controller_1 = require("./app.controller");
var app_service_1 = require("./app.service");
var auth_module_1 = require("./auth/auth.module");
var jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
var roles_guard_1 = require("./auth/guards/roles.guard");
var analytics_module_1 = require("./analytics/analytics.module");
var business_module_1 = require("./business/business.module");
var booking_module_1 = require("./booking/booking.module");
var events_module_1 = require("./events/events.module");
var item_module_1 = require("./item/item.module");
var mail_module_1 = require("./mail/mail.module");
var media_module_1 = require("./media/media.module");
var notifications_module_1 = require("./notifications/notifications.module");
var operating_hours_module_1 = require("./operating-hours/operating-hours.module");
var prisma_module_1 = require("./prisma/prisma.module");
var claim_module_1 = require("./claim/claim.module");
var admin_module_1 = require("./admin/admin.module");
var ht_booking_module_1 = require("./ht-booking/ht-booking.module");
var AppModule = function () {
    var _classDecorators = [(0, common_1.Module)({
            imports: [
                config_1.ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: [
                        (0, path_1.resolve)(process.cwd(), '.env'),
                        (0, path_1.resolve)(process.cwd(), 'backend/.env'),
                        (0, path_1.join)(__dirname, '../.env'),
                    ],
                }),
                // SEGURANÇA: Rate limiting global — 60 req/min por IP por defeito.
                // Rotas sensíveis (ex: POST /bookings) têm limites mais restritos
                // definidos directamente no BookingController com @Throttle().
                throttler_1.ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
                auth_module_1.AuthModule,
                analytics_module_1.AnalyticsModule,
                business_module_1.BusinessModule,
                booking_module_1.BookingModule,
                events_module_1.EventsModule,
                item_module_1.ItemModule,
                mail_module_1.MailModule,
                media_module_1.MediaModule,
                notifications_module_1.NotificationsModule,
                operating_hours_module_1.OperatingHoursModule,
                prisma_module_1.PrismaModule,
                claim_module_1.ClaimModule,
                admin_module_1.AdminModule,
                ht_booking_module_1.HtBookingModule,
            ],
            controllers: [app_controller_1.AppController],
            providers: [
                app_service_1.AppService,
                {
                    provide: core_1.APP_GUARD,
                    useClass: jwt_auth_guard_1.JwtAuthGuard,
                },
                {
                    provide: core_1.APP_GUARD,
                    useClass: roles_guard_1.RolesGuard,
                },
                // SEGURANÇA: ThrottlerGuard global — aplica rate limiting a todas as rotas.
                {
                    provide: core_1.APP_GUARD,
                    useClass: throttler_1.ThrottlerGuard,
                },
            ],
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var AppModule = _classThis = /** @class */ (function () {
        function AppModule_1() {
        }
        return AppModule_1;
    }());
    __setFunctionName(_classThis, "AppModule");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        AppModule = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return AppModule = _classThis;
}();
exports.AppModule = AppModule;
