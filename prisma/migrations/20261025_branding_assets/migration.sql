CREATE TABLE `BrandAsset` (
 `id` VARCHAR(191) NOT NULL,
 `kind` VARCHAR(16) NOT NULL,
 `objectKey` VARCHAR(300) NOT NULL,
 `mimeType` VARCHAR(32) NOT NULL,
 `title` VARCHAR(140) NULL,
 `subtitle` VARCHAR(300) NULL,
 `ctaLabel` VARCHAR(50) NULL,
 `href` VARCHAR(200) NULL,
 `sortOrder` INTEGER NOT NULL DEFAULT 0,
 `active` BOOLEAN NOT NULL DEFAULT true,
 `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 INDEX `BrandAsset_kind_active_sortOrder_idx`(`kind`,`active`,`sortOrder`),
 PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
