-- Migration: v6_contract_flow_migration.sql
-- Purpose: Add Contract & Measurement Book (MB) fields to attendance_records and weekly_pay_sheet_items

-- 1. Add MB Measurement fields to attendance_records
ALTER TABLE `attendance_records` 
  ADD COLUMN `WorkDescription` VARCHAR(255) NULL AFTER `RatePerSqFt`,
  ADD COLUMN `DeductionSqFt` DECIMAL(12,2) NULL DEFAULT 0.00 AFTER `WorkDescription`;

-- 2. Add Contract Gross, Advance, and Retention fields to weekly_pay_sheet_items
ALTER TABLE `weekly_pay_sheet_items`
  ADD COLUMN `GrossAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER `Amount`,
  ADD COLUMN `AdvanceAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER `GrossAmount`,
  ADD COLUMN `RetentionPercent` DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER `AdvanceAmount`,
  ADD COLUMN `RetentionAmount` DECIMAL(18,2) NOT NULL DEFAULT 0.00 AFTER `RetentionPercent`;
