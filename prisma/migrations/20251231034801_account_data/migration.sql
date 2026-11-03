/*
  Warnings:

  - You are about to drop the `Device` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SharingSettings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SupportSignal` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SyncBlob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_userId_fkey";

-- DropForeignKey
ALTER TABLE "SharingSettings" DROP CONSTRAINT "SharingSettings_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "SupportSignal" DROP CONSTRAINT "SupportSignal_deviceId_fkey";

-- DropForeignKey
ALTER TABLE "SyncBlob" DROP CONSTRAINT "SyncBlob_userId_fkey";

-- DropTable
DROP TABLE "Device";

-- DropTable
DROP TABLE "SharingSettings";

-- DropTable
DROP TABLE "SupportSignal";

-- DropTable
DROP TABLE "SyncBlob";

-- DropEnum
DROP TYPE "RecipientType";

-- DropEnum
DROP TYPE "SummaryDetailLevel";

-- DropEnum
DROP TYPE "SupportSignalType";

-- CreateTable
CREATE TABLE "AccountData" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "bundle" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "AccountData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AccountData_userId_key" ON "AccountData"("userId");

-- AddForeignKey
ALTER TABLE "AccountData" ADD CONSTRAINT "AccountData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
