-- Studio Planner Database Initialization Script
-- Charset: utf8mb4, Collation: utf8mb4_unicode_ci

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS `studio_planner` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `studio_planner`;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL DEFAULT '',
  `email` VARCHAR(100) DEFAULT '',
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Projects Table
CREATE TABLE IF NOT EXISTS `projects` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `client` VARCHAR(255) DEFAULT '',
  `cid` VARCHAR(64) DEFAULT '',
  `phase` INT NOT NULL DEFAULT 0,
  `due` VARCHAR(50) DEFAULT '',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_proj_user` (`user_id`),
  INDEX `idx_proj_due` (`due`),
  INDEX `idx_proj_deleted` (`is_deleted`),
  CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Items / Tasks Table
CREATE TABLE IF NOT EXISTS `items` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `kind` VARCHAR(50) NOT NULL DEFAULT 'task',
  `date` VARCHAR(20) NOT NULL,
  `time` VARCHAR(20) DEFAULT '',
  `pid` VARCHAR(64) DEFAULT '',
  `cid` VARCHAR(64) DEFAULT '',
  `who` VARCHAR(255) DEFAULT '',
  `phone` VARCHAR(50) DEFAULT '',
  `done` TINYINT(1) NOT NULL DEFAULT 0,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_items_user` (`user_id`),
  INDEX `idx_items_date` (`date`),
  INDEX `idx_items_pid` (`pid`),
  INDEX `idx_items_deleted` (`is_deleted`),
  CONSTRAINT `fk_items_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Clients Table
CREATE TABLE IF NOT EXISTS `clients` (
  `id` VARCHAR(64) PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT '',
  `email` VARCHAR(100) DEFAULT '',
  `company` VARCHAR(255) DEFAULT '',
  `notes` JSON NULL,
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_clients_user` (`user_id`),
  INDEX `idx_clients_deleted` (`is_deleted`),
  CONSTRAINT `fk_clients_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` INT NOT NULL,
  `label` VARCHAR(100) NOT NULL,
  `color` VARCHAR(50) DEFAULT '',
  `colorClass` VARCHAR(50) DEFAULT '',
  `icon` VARCHAR(50) DEFAULT '',
  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `user_id`),
  INDEX `idx_categories_user` (`user_id`),
  CONSTRAINT `fk_categories_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. User Settings Table
CREATE TABLE IF NOT EXISTS `user_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uq_user_setting` (`user_id`, `setting_key`),
  CONSTRAINT `fk_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Change Log (Audit & Sync Queue) Table
CREATE TABLE IF NOT EXISTS `change_log` (
  `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `entity_type` ENUM('item', 'project', 'client', 'category', 'setting') NOT NULL,
  `entity_id` VARCHAR(64) NOT NULL,
  `action` ENUM('create', 'update', 'delete') NOT NULL,
  `source` ENUM('online', 'offline') NOT NULL DEFAULT 'online',
  `payload` JSON NULL,
  `client_timestamp` BIGINT NOT NULL,
  `server_timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('applied', 'conflict', 'resolved') NOT NULL DEFAULT 'applied',
  `conflict_details` JSON NULL,
  `operation_id` VARCHAR(64) NULL,
  INDEX `idx_log_user` (`user_id`),
  INDEX `idx_log_entity` (`entity_type`, `entity_id`),
  INDEX `idx_log_timestamp` (`client_timestamp`),
  INDEX `idx_log_source` (`source`),
  INDEX `idx_log_status` (`status`),
  UNIQUE KEY `uq_log_operation` (`user_id`, `operation_id`),
  CONSTRAINT `fk_changelog_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No default users or passwords are created here.
-- New accounts register through the application, which seeds their own
-- categories and settings. This prevents a known admin credential in fresh
-- production databases.
