-- v4_civil-erp_script.sql
-- Add Discount column to site_materials table
-- Discount is the negotiated reduction from the bill amount
-- Net Amount (paid to dealer) = Amount - Discount

ALTER TABLE site_materials 
ADD COLUMN IF NOT EXISTS Discount DECIMAL(18,2) NOT NULL DEFAULT 0.00 
AFTER Amount;
