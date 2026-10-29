ALTER TABLE `MerchantSettlement`
  ADD COLUMN `requestedById` VARCHAR(191) NULL,
  ADD COLUMN `payoutMethod` VARCHAR(20) NULL,
  ADD COLUMN `payoutAccount` VARCHAR(120) NULL,
  ADD COLUMN `bankName` VARCHAR(120) NULL,
  ADD COLUMN `reviewedById` VARCHAR(191) NULL,
  ADD COLUMN `reviewedAt` DATETIME(3) NULL,
  ADD COLUMN `reviewNote` VARCHAR(500) NULL;
CREATE INDEX `MerchantSettlement_merchantId_status_createdAt_idx` ON `MerchantSettlement` (`merchantId`,`status`,`createdAt`);