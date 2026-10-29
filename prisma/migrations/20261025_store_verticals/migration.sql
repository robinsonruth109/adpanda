-- Preserve all existing kitchens as FOOD stores.
ALTER TABLE `Kitchen`
 ADD COLUMN `storeType` ENUM('FOOD','GROCERY','STATIONERY') NOT NULL DEFAULT 'FOOD';
CREATE INDEX `Kitchen_storeType_active_idx` ON `Kitchen`(`storeType`,`active`);

-- Piece, pack, 1 kg, 500 g, etc. are individual saleable SKUs for the initial marketplace release.
-- NULL stock means untracked; 0 means sold out. Product quantities remain integer packs/units.
ALTER TABLE `MenuItem`
 ADD COLUMN `unitLabel` VARCHAR(32) NOT NULL DEFAULT 'piece',
 ADD COLUMN `stockQty` INTEGER NULL;
