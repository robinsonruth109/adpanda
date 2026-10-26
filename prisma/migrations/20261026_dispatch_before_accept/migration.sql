ALTER TABLE `Order` ADD COLUMN `dispatchRequestedAt` DATETIME(3) NULL;
CREATE INDEX `Order_dispatchRequestedAt_status_idx` ON `Order` (`dispatchRequestedAt`, `status`);
