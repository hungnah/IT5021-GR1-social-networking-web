"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("@nestjs/typeorm");
const typeorm_3 = require("typeorm");
const auth_module_1 = require("./auth/auth.module");
const posts_module_1 = require("./posts/posts.module");
const users_module_1 = require("./users/users.module");
let AppModule = class AppModule {
    dataSource;
    logger = new common_1.Logger('AppModule');
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async onModuleInit() {
        const migrations = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url VARCHAR(255)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(50)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(255)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token_expires_at TIMESTAMPTZ`,
            `ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_url VARCHAR(500)`,
        ];
        for (const sql of migrations) {
            try {
                await this.dataSource.query(sql);
            }
            catch (err) {
                this.logger.warn(`Migration skipped: ${err.message}`);
            }
        }
        this.logger.log('DB columns verified/migrated');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (configService) => ({
                    type: 'postgres',
                    host: configService.get('DB_HOST', 'localhost'),
                    port: Number(configService.get('DB_PORT', '5432')),
                    username: configService.get('DB_USERNAME', 'postgres'),
                    password: configService.get('DB_PASSWORD', ''),
                    database: configService.get('DB_DATABASE', 'feedme'),
                    autoLoadEntities: true,
                    synchronize: false,
                }),
            }),
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            posts_module_1.PostsModule,
        ],
    }),
    __param(0, (0, typeorm_2.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_3.DataSource])
], AppModule);
//# sourceMappingURL=app.module.js.map