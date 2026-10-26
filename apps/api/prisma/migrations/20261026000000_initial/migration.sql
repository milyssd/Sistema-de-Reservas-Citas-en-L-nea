-- CreateTable
CREATE TABLE `Business` (
    `id` CHAR(36) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'BOB',
    `locale` VARCHAR(16) NOT NULL DEFAULT 'es-BO',
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'America/La_Paz',
    `logoUrl` VARCHAR(512) NULL,
    `brandColor` CHAR(7) NOT NULL DEFAULT '#146C94',
    `minimumNoticeMinutes` INTEGER NOT NULL DEFAULT 60,
    `maximumAdvanceDays` INTEGER NOT NULL DEFAULT 60,
    `slotIntervalMinutes` INTEGER NOT NULL DEFAULT 15,
    `cancellationHours` INTEGER NOT NULL DEFAULT 12,
    `holdMinutes` INTEGER NOT NULL DEFAULT 10,
    `paymentExpiryHours` INTEGER NOT NULL DEFAULT 24,
    `maxPendingBookings` INTEGER NOT NULL DEFAULT 3,
    `maxNoShows` INTEGER NOT NULL DEFAULT 3,
    `autoConfirm` BOOLEAN NOT NULL DEFAULT true,
    `assignmentRule` VARCHAR(20) NOT NULL DEFAULT 'LEAST_BUSY',
    `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
    `featureFlags` JSON NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Business_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('CLIENT', 'STAFF', 'ADMIN', 'OWNER', 'SUPERADMIN') NOT NULL DEFAULT 'CLIENT',
    `emailVerifiedAt` DATETIME(3) NULL,
    `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `totpSecret` VARCHAR(512) NULL,
    `totpEnabled` BOOLEAN NOT NULL DEFAULT false,
    `notificationPreferences` JSON NULL,
    `deletedAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `User_businessId_role_idx`(`businessId`, `role`),
    UNIQUE INDEX `User_businessId_email_key`(`businessId`, `email`),
    UNIQUE INDEX `User_businessId_id_key`(`businessId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Location` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `address` VARCHAR(300) NOT NULL,
    `timezone` VARCHAR(64) NOT NULL DEFAULT 'America/La_Paz',
    `phone` VARCHAR(20) NULL,
    `latitude` DECIMAL(10, 7) NULL,
    `longitude` DECIMAL(10, 7) NULL,
    `mapUrl` VARCHAR(512) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Location_businessId_active_idx`(`businessId`, `active`),
    UNIQUE INDEX `Location_businessId_id_key`(`businessId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ServiceCategory` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ServiceCategory_businessId_name_key`(`businessId`, `name`),
    UNIQUE INDEX `ServiceCategory_businessId_id_key`(`businessId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `categoryId` CHAR(36) NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `bufferBeforeMinutes` INTEGER NOT NULL DEFAULT 0,
    `bufferAfterMinutes` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(10, 2) NOT NULL,
    `depositAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `depositPercent` INTEGER NULL,
    `capacity` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `onlineBookable` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Service_businessId_active_onlineBookable_idx`(`businessId`, `active`, `onlineBookable`),
    UNIQUE INDEX `Service_businessId_id_key`(`businessId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Staff` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `locationId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `bio` TEXT NULL,
    `photoUrl` VARCHAR(512) NULL,
    `isResource` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `calendarTokenHash` CHAR(64) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Staff_userId_key`(`userId`),
    INDEX `Staff_businessId_locationId_active_idx`(`businessId`, `locationId`, `active`),
    UNIQUE INDEX `Staff_businessId_id_key`(`businessId`, `id`),
    UNIQUE INDEX `Staff_businessId_userId_key`(`businessId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StaffService` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `durationMinutes` INTEGER NULL,
    `price` DECIMAL(10, 2) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StaffService_businessId_staffId_serviceId_key`(`businessId`, `staffId`, `serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkingHours` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NOT NULL,
    `locationId` CHAR(36) NOT NULL,
    `dayOfWeek` INTEGER NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WorkingHours_businessId_locationId_dayOfWeek_idx`(`businessId`, `locationId`, `dayOfWeek`),
    UNIQUE INDEX `WorkingHours_businessId_staffId_dayOfWeek_startMinute_key`(`businessId`, `staffId`, `dayOfWeek`, `startMinute`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeOff` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NULL,
    `locationId` CHAR(36) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `reason` VARCHAR(200) NULL,
    `isHoliday` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TimeOff_businessId_locationId_startAt_endAt_idx`(`businessId`, `locationId`, `startAt`, `endAt`),
    INDEX `TimeOff_staffId_startAt_idx`(`staffId`, `startAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Customer` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `name` VARCHAR(120) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `internalNotes` TEXT NULL,
    `tags` JSON NULL,
    `noShowCount` INTEGER NOT NULL DEFAULT 0,
    `blocked` BOOLEAN NOT NULL DEFAULT false,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Customer_userId_key`(`userId`),
    UNIQUE INDEX `Customer_businessId_email_key`(`businessId`, `email`),
    UNIQUE INDEX `Customer_businessId_userId_key`(`businessId`, `userId`),
    UNIQUE INDEX `Customer_businessId_id_key`(`businessId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` CHAR(36) NOT NULL,
    `code` CHAR(8) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `locationId` CHAR(36) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NOT NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'EXPIRED') NOT NULL DEFAULT 'PENDING',
    `source` ENUM('WEB', 'MOBILE', 'ADMIN', 'WALK_IN') NOT NULL DEFAULT 'WEB',
    `totalAmount` DECIMAL(10, 2) NOT NULL,
    `depositAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `currency` CHAR(3) NOT NULL DEFAULT 'BOB',
    `notes` TEXT NULL,
    `cancellationReason` VARCHAR(500) NULL,
    `manageTokenHash` CHAR(64) NULL,
    `expiresAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Booking_code_key`(`code`),
    INDEX `Booking_staffId_startAt_idx`(`staffId`, `startAt`),
    INDEX `Booking_businessId_startAt_idx`(`businessId`, `startAt`),
    INDEX `Booking_customerId_startAt_idx`(`customerId`, `startAt`),
    INDEX `Booking_businessId_status_expiresAt_idx`(`businessId`, `status`, `expiresAt`),
    UNIQUE INDEX `Booking_businessId_id_key`(`businessId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingItem` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NOT NULL,
    `serviceName` VARCHAR(150) NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `bufferBeforeMinutes` INTEGER NOT NULL DEFAULT 0,
    `bufferAfterMinutes` INTEGER NOT NULL DEFAULT 0,
    `price` DECIMAL(10, 2) NOT NULL,
    `depositAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `capacity` INTEGER NOT NULL DEFAULT 1,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `BookingItem_staffId_startAt_endAt_idx`(`staffId`, `startAt`, `endAt`),
    INDEX `BookingItem_businessId_bookingId_idx`(`businessId`, `bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SlotClaim` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `minute` DATETIME(3) NOT NULL,
    `seat` INTEGER NOT NULL DEFAULT 0,

    INDEX `SlotClaim_businessId_bookingId_idx`(`businessId`, `bookingId`),
    UNIQUE INDEX `SlotClaim_businessId_staffId_minute_seat_key`(`businessId`, `staffId`, `minute`, `seat`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Hold` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `locationId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `serviceIds` JSON NULL,
    `startAt` DATETIME(3) NOT NULL,
    `endAt` DATETIME(3) NOT NULL,
    `bufferBeforeMinutes` INTEGER NOT NULL DEFAULT 0,
    `bufferAfterMinutes` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Hold_staffId_startAt_endAt_idx`(`staffId`, `startAt`, `endAt`),
    INDEX `Hold_businessId_expiresAt_idx`(`businessId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `currency` CHAR(3) NOT NULL DEFAULT 'BOB',
    `method` ENUM('QR', 'TRANSFER', 'CASH') NOT NULL,
    `status` ENUM('PENDING', 'SUBMITTED', 'CONFIRMED', 'REJECTED', 'REFUNDED', 'RETAINED') NOT NULL DEFAULT 'PENDING',
    `receiptPath` VARCHAR(512) NULL,
    `receiptMime` VARCHAR(40) NULL,
    `reference` VARCHAR(200) NULL,
    `confirmedById` CHAR(36) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `reason` VARCHAR(500) NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Payment_businessId_status_createdAt_idx`(`businessId`, `status`, `createdAt`),
    INDEX `Payment_businessId_bookingId_idx`(`businessId`, `bookingId`),
    UNIQUE INDEX `Payment_businessId_id_key`(`businessId`, `id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reminder` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `channel` ENUM('EMAIL', 'WEB_PUSH', 'EXPO_PUSH', 'IN_APP') NOT NULL DEFAULT 'EMAIL',
    `scheduledAt` DATETIME(3) NOT NULL,
    `sentAt` DATETIME(3) NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(500) NULL,

    INDEX `Reminder_status_scheduledAt_idx`(`status`, `scheduledAt`),
    UNIQUE INDEX `Reminder_businessId_bookingId_channel_scheduledAt_key`(`businessId`, `bookingId`, `channel`, `scheduledAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WaitlistEntry` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `locationId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `staffId` CHAR(36) NULL,
    `from` DATETIME(3) NOT NULL,
    `to` DATETIME(3) NOT NULL,
    `status` ENUM('WAITING', 'NOTIFIED', 'BOOKED', 'CANCELLED') NOT NULL DEFAULT 'WAITING',
    `notifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `version` INTEGER NOT NULL DEFAULT 1,

    INDEX `WaitlistEntry_businessId_locationId_serviceId_status_from_idx`(`businessId`, `locationId`, `serviceId`, `status`, `from`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Review` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `bookingId` CHAR(36) NOT NULL,
    `customerId` CHAR(36) NOT NULL,
    `rating` INTEGER NOT NULL,
    `comment` VARCHAR(1000) NULL,
    `visible` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Review_bookingId_key`(`bookingId`),
    INDEX `Review_businessId_visible_createdAt_idx`(`businessId`, `visible`, `createdAt`),
    UNIQUE INDEX `Review_businessId_bookingId_key`(`businessId`, `bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `recipient` VARCHAR(254) NOT NULL,
    `event` VARCHAR(80) NOT NULL,
    `channel` ENUM('EMAIL', 'WEB_PUSH', 'EXPO_PUSH', 'IN_APP') NOT NULL DEFAULT 'EMAIL',
    `subject` VARCHAR(200) NOT NULL,
    `body` TEXT NOT NULL,
    `payload` JSON NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'SENT', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `maxAttempts` INTEGER NOT NULL DEFAULT 5,
    `scheduledAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `readAt` DATETIME(3) NULL,
    `lastError` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_status_scheduledAt_idx`(`status`, `scheduledAt`),
    INDEX `Notification_businessId_userId_createdAt_idx`(`businessId`, `userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeviceToken` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `channel` ENUM('EMAIL', 'WEB_PUSH', 'EXPO_PUSH', 'IN_APP') NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `token` TEXT NOT NULL,
    `deviceName` VARCHAR(150) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `DeviceToken_businessId_userId_idx`(`businessId`, `userId`),
    UNIQUE INDEX `DeviceToken_businessId_tokenHash_key`(`businessId`, `tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RefreshSession` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `familyId` CHAR(36) NOT NULL,
    `replacedById` CHAR(36) NULL,
    `deviceName` VARCHAR(150) NULL,
    `userAgent` VARCHAR(512) NULL,
    `ip` VARCHAR(45) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RefreshSession_tokenHash_key`(`tokenHash`),
    INDEX `RefreshSession_businessId_userId_revokedAt_idx`(`businessId`, `userId`, `revokedAt`),
    INDEX `RefreshSession_familyId_idx`(`familyId`),
    INDEX `RefreshSession_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuthToken` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `tokenHash` CHAR(64) NOT NULL,
    `purpose` ENUM('VERIFY_EMAIL', 'RESET_PASSWORD') NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `consumedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AuthToken_tokenHash_key`(`tokenHash`),
    INDEX `AuthToken_businessId_userId_purpose_idx`(`businessId`, `userId`, `purpose`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `userId` CHAR(36) NULL,
    `action` VARCHAR(100) NOT NULL,
    `entityType` VARCHAR(60) NOT NULL,
    `entityId` CHAR(36) NULL,
    `ip` VARCHAR(45) NULL,
    `requestId` VARCHAR(64) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuditLog_businessId_createdAt_idx`(`businessId`, `createdAt`),
    INDEX `AuditLog_businessId_entityType_entityId_idx`(`businessId`, `entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` JSON NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_businessId_key_key`(`businessId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IdempotencyRecord` (
    `id` CHAR(36) NOT NULL,
    `businessId` CHAR(36) NOT NULL,
    `key` VARCHAR(128) NOT NULL,
    `scope` VARCHAR(100) NOT NULL,
    `requestHash` CHAR(64) NOT NULL,
    `response` JSON NOT NULL,
    `statusCode` INTEGER NOT NULL DEFAULT 201,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `IdempotencyRecord_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `IdempotencyRecord_businessId_scope_key_key`(`businessId`, `scope`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Location` ADD CONSTRAINT `Location_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ServiceCategory` ADD CONSTRAINT `ServiceCategory_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_businessId_categoryId_fkey` FOREIGN KEY (`businessId`, `categoryId`) REFERENCES `ServiceCategory`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_businessId_locationId_fkey` FOREIGN KEY (`businessId`, `locationId`) REFERENCES `Location`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Staff` ADD CONSTRAINT `Staff_businessId_userId_fkey` FOREIGN KEY (`businessId`, `userId`) REFERENCES `User`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffService` ADD CONSTRAINT `StaffService_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StaffService` ADD CONSTRAINT `StaffService_businessId_serviceId_fkey` FOREIGN KEY (`businessId`, `serviceId`) REFERENCES `Service`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkingHours` ADD CONSTRAINT `WorkingHours_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkingHours` ADD CONSTRAINT `WorkingHours_businessId_locationId_fkey` FOREIGN KEY (`businessId`, `locationId`) REFERENCES `Location`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeOff` ADD CONSTRAINT `TimeOff_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeOff` ADD CONSTRAINT `TimeOff_businessId_locationId_fkey` FOREIGN KEY (`businessId`, `locationId`) REFERENCES `Location`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Customer` ADD CONSTRAINT `Customer_businessId_userId_fkey` FOREIGN KEY (`businessId`, `userId`) REFERENCES `User`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_businessId_locationId_fkey` FOREIGN KEY (`businessId`, `locationId`) REFERENCES `Location`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_businessId_customerId_fkey` FOREIGN KEY (`businessId`, `customerId`) REFERENCES `Customer`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingItem` ADD CONSTRAINT `BookingItem_businessId_bookingId_fkey` FOREIGN KEY (`businessId`, `bookingId`) REFERENCES `Booking`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingItem` ADD CONSTRAINT `BookingItem_businessId_serviceId_fkey` FOREIGN KEY (`businessId`, `serviceId`) REFERENCES `Service`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingItem` ADD CONSTRAINT `BookingItem_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SlotClaim` ADD CONSTRAINT `SlotClaim_businessId_bookingId_fkey` FOREIGN KEY (`businessId`, `bookingId`) REFERENCES `Booking`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hold` ADD CONSTRAINT `Hold_businessId_locationId_fkey` FOREIGN KEY (`businessId`, `locationId`) REFERENCES `Location`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hold` ADD CONSTRAINT `Hold_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Hold` ADD CONSTRAINT `Hold_businessId_serviceId_fkey` FOREIGN KEY (`businessId`, `serviceId`) REFERENCES `Service`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_businessId_bookingId_fkey` FOREIGN KEY (`businessId`, `bookingId`) REFERENCES `Booking`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reminder` ADD CONSTRAINT `Reminder_businessId_bookingId_fkey` FOREIGN KEY (`businessId`, `bookingId`) REFERENCES `Booking`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WaitlistEntry` ADD CONSTRAINT `WaitlistEntry_businessId_customerId_fkey` FOREIGN KEY (`businessId`, `customerId`) REFERENCES `Customer`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WaitlistEntry` ADD CONSTRAINT `WaitlistEntry_businessId_locationId_fkey` FOREIGN KEY (`businessId`, `locationId`) REFERENCES `Location`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WaitlistEntry` ADD CONSTRAINT `WaitlistEntry_businessId_serviceId_fkey` FOREIGN KEY (`businessId`, `serviceId`) REFERENCES `Service`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WaitlistEntry` ADD CONSTRAINT `WaitlistEntry_businessId_staffId_fkey` FOREIGN KEY (`businessId`, `staffId`) REFERENCES `Staff`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_businessId_bookingId_fkey` FOREIGN KEY (`businessId`, `bookingId`) REFERENCES `Booking`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Review` ADD CONSTRAINT `Review_businessId_customerId_fkey` FOREIGN KEY (`businessId`, `customerId`) REFERENCES `Customer`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_businessId_userId_fkey` FOREIGN KEY (`businessId`, `userId`) REFERENCES `User`(`businessId`, `id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeviceToken` ADD CONSTRAINT `DeviceToken_businessId_userId_fkey` FOREIGN KEY (`businessId`, `userId`) REFERENCES `User`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RefreshSession` ADD CONSTRAINT `RefreshSession_businessId_userId_fkey` FOREIGN KEY (`businessId`, `userId`) REFERENCES `User`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuthToken` ADD CONSTRAINT `AuthToken_businessId_userId_fkey` FOREIGN KEY (`businessId`, `userId`) REFERENCES `User`(`businessId`, `id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Setting` ADD CONSTRAINT `Setting_businessId_fkey` FOREIGN KEY (`businessId`) REFERENCES `Business`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

