-- v4 Schema Migration Script

-- 1. Add CalculationMode to material_types
ALTER TABLE material_types ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Manual';

-- 2. Add sq-ft fields to site_materials
ALTER TABLE site_materials ADD COLUMN Length DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE site_materials ADD COLUMN Breadth DECIMAL(10,2) DEFAULT NULL;
ALTER TABLE site_materials ADD COLUMN SqFt DECIMAL(12,2) DEFAULT NULL;
ALTER TABLE site_materials ADD COLUMN WastagePercent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE site_materials ADD COLUMN RatePerUnit DECIMAL(18,2) DEFAULT 0;
ALTER TABLE site_materials ADD COLUMN CalculationMode VARCHAR(30) DEFAULT 'Manual';

-- 3. Link weekly_pay_sheet_items to site_materials for dealer rows
ALTER TABLE weekly_pay_sheet_items ADD COLUMN SourceType VARCHAR(30) DEFAULT 'Attendance';
ALTER TABLE weekly_pay_sheet_items ADD COLUMN SourceMaterialIds TEXT DEFAULT NULL;

-- 4. Action logs for undo
CREATE TABLE IF NOT EXISTS action_logs (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    WeeklyPaySheetId INT NOT NULL,
    ActionType VARCHAR(50) NOT NULL,
    EntityType VARCHAR(30) NOT NULL,
    EntityId INT DEFAULT NULL,
    BeforeData JSON DEFAULT NULL,
    AfterData JSON DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    IsUndone TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_action_logs_sheet (WeeklyPaySheetId),
    INDEX idx_action_logs_created (CreatedAt)
);

-- 5. Site floors/sections
CREATE TABLE IF NOT EXISTS site_sections (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    SiteId INT NOT NULL,
    Name VARCHAR(100) NOT NULL,
    SortOrder INT DEFAULT 0,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
);

-- 6. Site projects/work orders
CREATE TABLE IF NOT EXISTS site_projects (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    SiteId INT NOT NULL,
    ProjectName VARCHAR(200) NOT NULL,
    WorkType VARCHAR(100) DEFAULT 'New Construction',
    StartDate DATE DEFAULT NULL,
    EndDate DATE DEFAULT NULL,
    Status VARCHAR(30) DEFAULT 'In Progress',
    QuotedValue DECIMAL(18,2) DEFAULT 0,
    Notes VARCHAR(500) DEFAULT NULL,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (SiteId) REFERENCES sites(Id) ON DELETE CASCADE
);

-- 7. Optional floor/project linkage on existing tables
ALTER TABLE site_materials ADD COLUMN SectionId INT DEFAULT NULL;
ALTER TABLE site_materials ADD COLUMN ProjectId INT DEFAULT NULL;
ALTER TABLE attendance_records ADD COLUMN SectionId INT DEFAULT NULL;
ALTER TABLE attendance_records ADD COLUMN ProjectId INT DEFAULT NULL;
ALTER TABLE weekly_pay_sheet_items ADD COLUMN ProjectId INT DEFAULT NULL;
