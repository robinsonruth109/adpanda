ALTER TABLE `Kitchen`
 ADD COLUMN `groceryReviewedDate` VARCHAR(10) NULL,
 ADD COLUMN `groceryCatalogVersion` INT NOT NULL DEFAULT 0,
 ADD COLUMN `groceryPriceReviewedAt` DATETIME(3) NULL,
 ADD COLUMN `groceryPriceReviewedById` VARCHAR(191) NULL;
