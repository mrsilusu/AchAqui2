-- Foundation for Phase 5/6: feed, loyalty and push device tokens

CREATE TABLE IF NOT EXISTS "business_feed_posts" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "authorId" TEXT,
  "content" TEXT NOT NULL,
  "mediaUrl" TEXT,
  "isPinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "business_feed_posts_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_feed_posts_businessId_fkey') THEN
    ALTER TABLE "business_feed_posts"
      ADD CONSTRAINT "business_feed_posts_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'business_feed_posts_authorId_fkey') THEN
    ALTER TABLE "business_feed_posts"
      ADD CONSTRAINT "business_feed_posts_authorId_fkey"
      FOREIGN KEY ("authorId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "business_feed_posts_businessId_createdAt_idx"
  ON "business_feed_posts"("businessId", "createdAt");

CREATE TABLE IF NOT EXISTS "loyalty_ledger" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "pointsDelta" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "loyalty_ledger_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_ledger_userId_fkey') THEN
    ALTER TABLE "loyalty_ledger"
      ADD CONSTRAINT "loyalty_ledger_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loyalty_ledger_businessId_fkey') THEN
    ALTER TABLE "loyalty_ledger"
      ADD CONSTRAINT "loyalty_ledger_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "Business"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "loyalty_ledger_userId_businessId_createdAt_idx"
  ON "loyalty_ledger"("userId", "businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "loyalty_ledger_businessId_createdAt_idx"
  ON "loyalty_ledger"("businessId", "createdAt");

CREATE TABLE IF NOT EXISTS "device_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'expo',
  "platform" TEXT,
  "appVersion" TEXT,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'device_tokens_userId_fkey') THEN
    ALTER TABLE "device_tokens"
      ADD CONSTRAINT "device_tokens_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "device_tokens_userId_token_key"
  ON "device_tokens"("userId", "token");

CREATE INDEX IF NOT EXISTS "device_tokens_provider_updatedAt_idx"
  ON "device_tokens"("provider", "updatedAt");
