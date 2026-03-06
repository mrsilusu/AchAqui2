import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

function resolveSslMode() {
  if (process.env.DATABASE_SSLMODE) return process.env.DATABASE_SSLMODE;
  return process.env.NODE_ENV === 'production' ? 'require' : 'disable';
}

function withSslMode(url: string | undefined) {
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    parsed.searchParams.set('sslmode', resolveSslMode());
    return parsed.toString();
  } catch {
    return url;
  }
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const runtimeDbUrl = withSslMode(process.env.DATABASE_URL);

    super({
      ...(runtimeDbUrl
        ? {
            datasources: {
              db: {
                url: runtimeDbUrl,
              },
            },
          }
        : {}),
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
