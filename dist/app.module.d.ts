import type { OnModuleInit } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
export declare class AppModule implements OnModuleInit {
    private readonly logger;
    private readonly moduleRef;
    private dataSource;
    constructor(moduleRef: ModuleRef);
    onModuleInit(): Promise<void>;
}
