-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "SummaryDetailLevel" AS ENUM ('SIMPLE', 'MEDIUM', 'DETAILED');

-- CreateEnum
CREATE TYPE "SupportSignalType" AS ENUM ('FEELING_DOWN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncBlob" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "kdf" TEXT NOT NULL,
    "saltB64" TEXT NOT NULL,
    "ivB64" TEXT NOT NULL,
    "dataB64" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "SyncBlob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceKey" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Vancouver',
    "userId" TEXT,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharingSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "recipientType" "RecipientType",
    "recipientValue" TEXT,
    "detailLevel" "SummaryDetailLevel" NOT NULL DEFAULT 'SIMPLE',
    "includeGoals" BOOLEAN NOT NULL DEFAULT true,
    "includeMood" BOOLEAN NOT NULL DEFAULT true,
    "includeWins" BOOLEAN NOT NULL DEFAULT true,
    "includeSelfCare" BOOLEAN NOT NULL DEFAULT false,
    "sendWeekday" INTEGER,
    "sendHour" INTEGER,
    "sendMinute" INTEGER,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "lastSentAt" TIMESTAMP(3),
    "consentedAt" TIMESTAMP(3),

    CONSTRAINT "SharingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSignal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,
    "type" "SupportSignalType" NOT NULL,
    "recipientType" "RecipientType" NOT NULL,
    "recipientValue" TEXT NOT NULL,
    "optionalNote" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerMsgId" TEXT,

    CONSTRAINT "SupportSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SyncBlob_userId_key" ON "SyncBlob"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Device_deviceKey_key" ON "Device"("deviceKey");

-- CreateIndex
CREATE UNIQUE INDEX "SharingSettings_deviceId_key" ON "SharingSettings"("deviceId");

-- AddForeignKey
ALTER TABLE "SyncBlob" ADD CONSTRAINT "SyncBlob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SharingSettings" ADD CONSTRAINT "SharingSettings_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSignal" ADD CONSTRAINT "SupportSignal_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
