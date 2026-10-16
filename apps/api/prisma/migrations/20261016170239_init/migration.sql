-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'NO_COMPARABLES', 'FAILED');

-- CreateEnum
CREATE TYPE "MarketPlatform" AS ENUM ('EBAY', 'GOOGLE_SHOPPING', 'GRAILED', 'DEPOP', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'PROCESSING',
    "brand" TEXT,
    "garmentType" TEXT,
    "searchQueryString" TEXT,
    "geminiModel" TEXT,
    "rawGeminiResponse" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuations" (
    "id" UUID NOT NULL,
    "scanId" UUID NOT NULL,
    "estimatedLowPrice" DECIMAL(10,2) NOT NULL,
    "estimatedHighPrice" DECIMAL(10,2) NOT NULL,
    "medianPrice" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "suggestedEra" TEXT NOT NULL,
    "queryUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valuations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_comparables" (
    "id" UUID NOT NULL,
    "valuationId" UUID NOT NULL,
    "platform" "MarketPlatform" NOT NULL,
    "itemUrl" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "title" TEXT NOT NULL,
    "thumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_comparables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "scans_userId_createdAt_idx" ON "scans"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "scans_brand_idx" ON "scans"("brand");

-- CreateIndex
CREATE UNIQUE INDEX "valuations_scanId_key" ON "valuations"("scanId");

-- CreateIndex
CREATE INDEX "market_comparables_valuationId_idx" ON "market_comparables"("valuationId");

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuations" ADD CONSTRAINT "valuations_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_comparables" ADD CONSTRAINT "market_comparables_valuationId_fkey" FOREIGN KEY ("valuationId") REFERENCES "valuations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
