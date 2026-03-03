import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      ...(process.env.PRISMA_CLIENT_MODE === 'dataproxy' &&
      process.env.PRISMA_DATA_PROXY_URL
        ? {
            datasources: {
              db: {
                url: process.env.PRISMA_DATA_PROXY_URL,
              },
            },
          }
        : {}),
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
