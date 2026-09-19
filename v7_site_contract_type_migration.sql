-- Migration v7: Site Construction Type & Contract Person SqFt Rates
-- Adds ConstructionType ('Normal' | 'Contract') and ContractRates (JSON string) to sites table

ALTER TABLE `sites` 
ADD COLUMN `ConstructionType` VARCHAR(30) NOT NULL DEFAULT 'Normal';

ALTER TABLE `sites` 
ADD COLUMN `ContractRates` TEXT NULL;
