ALTER TABLE `Order` MODIFY COLUMN `customerId` VARCHAR(191) NULL;
ALTER TABLE `Address` MODIFY COLUMN `userId` VARCHAR(191) NULL;
ALTER TABLE `Order`
 ADD COLUMN `recipientName` VARCHAR(100) NULL,
 ADD COLUMN `recipientPhone` VARCHAR(20) NULL,
 ADD COLUMN `guestTokenHash` CHAR(64) NULL,
 ADD UNIQUE INDEX `Order_guestTokenHash_key`(`guestTokenHash`);
UPDATE `Order` o INNER JOIN `User` u ON o.customerId = u.id
 SET o.recipientName = u.name, o.recipientPhone = u.phone
 WHERE o.recipientPhone IS NULL;
