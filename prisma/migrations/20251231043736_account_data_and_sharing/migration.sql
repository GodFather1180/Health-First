-- CreateEnum
CREATE TYPE "RecipientType" AS ENUM ('EMAIL', 'SMS');

-- CreateEnum
CREATE TYPE "SummaryDetailLevel" AS ENUM ('SIMPLE', 'MEDIUM', 'DETAILED');

-- CreateEnum
CREATE TYPE "SupportSignalType" AS ENUM ('FEELING_DOWN');

-- CreateTable
CREATE TABLE "SharingSettings" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
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
    "userId" TEXT NOT NULL,
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
CREATE UNIQUE INDEX "SharingSettings_userId_key" ON "SharingSettings"("userId");

-- AddForeignKey
ALTER TABLE "SharingSettings" ADD CONSTRAINT "SharingSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportSignal" ADD CONSTRAINT "SupportSignal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
