-- AlterTable
ALTER TABLE `Payment` ADD COLUMN `refundedAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- Before this migration REFUNDED always meant the full original payment.
UPDATE `Payment` SET `refundedAmount` = `amount` WHERE `status` = 'REFUNDED';

-- CreateTable
CREATE TABLE `HoldItem` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `holdId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `bufferBeforeMinutes` INTEGER NOT NULL DEFAULT 0,
    `bufferAfterMinutes` INTEGER NOT NULL DEFAULT 0,
    `position` INTEGER NOT NULL,

    INDEX `HoldItem_staffId_startAt_endAt_idx`(`staffId`, `startAt`, `endAt`),
    UNIQUE INDEX `HoldItem_businessId_holdId_position_key`(`businessId`, `holdId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentRefund` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `paymentId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reason` VARCHAR(500) NOT NULL,
    `recordedById` CHAR(36) NOT NULL,
    `idempotencyKey` VARCHAR(128) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PaymentRefund_businessId_createdAt_idx`(`businessId`, `createdAt`),
    UNIQUE INDEX `PaymentRefund_businessId_paymentId_idempotencyKey_key`(`businessId`, `paymentId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Hold_businessId_id_key` ON `Hold`(`businessId`, `id`);

-- AddForeignKey
ALTER TABLE `HoldItem` ADD CONSTRAINT `HoldItem_businessId_holdId_fkey` FOREIGN KEY (`businessId`, `holdId`) REFERENCES `Hold`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HoldItem` ADD CONSTRAINT `HoldItem_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HoldItem` ADD CONSTRAINT `HoldItem_businessId_serviceId_fkey` FOREIGN KEY (`businessId`, `serviceId`) REFERENCES `Service`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRefund` ADD CONSTRAINT `PaymentRefund_businessId_paymentId_fkey` FOREIGN KEY (`businessId`, `paymentId`) REFERENCES `Payment`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRefund` ADD CONSTRAINT `PaymentRefund_businessId_recordedById_fkey` FOREIGN KEY (`businessId`, `recordedById`) REFERENCES `User`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;
