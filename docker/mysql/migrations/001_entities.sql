-- Non-destructive migration to the new user-facing entities concept.
CREATE TABLE IF NOT EXISTS `entities` LIKE `clients`;
INSERT INTO `entities` SELECT * FROM `clients`
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`), `phone`=VALUES(`phone`), `email`=VALUES(`email`), `company`=VALUES(`company`), `notes`=VALUES(`notes`), `is_deleted`=VALUES(`is_deleted`), `updated_at`=VALUES(`updated_at`);
