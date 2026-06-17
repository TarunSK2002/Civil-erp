CREATE DATABASE  IF NOT EXISTS `jeeva_construction` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `jeeva_construction`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: jeeva_construction
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `__efmigrationshistory`
--

DROP TABLE IF EXISTS `__efmigrationshistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__efmigrationshistory` (
  `MigrationId` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProductVersion` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_miscs`
--

DROP TABLE IF EXISTS `attendance_miscs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_miscs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `AttendanceSheetId` int NOT NULL,
  `PayeeId` int NOT NULL,
  `MiscName` varchar(200) NOT NULL,
  `Amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `CreatedAt` datetime DEFAULT NULL,
  `SiteId` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `attendance_miscs_SiteId_foreign_idx` (`SiteId`),
  KEY `AttendanceSheetId` (`AttendanceSheetId`),
  KEY `PayeeId` (`PayeeId`),
  CONSTRAINT `attendance_miscs_ibfk_3` FOREIGN KEY (`AttendanceSheetId`) REFERENCES `attendance_sheets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_miscs_ibfk_4` FOREIGN KEY (`PayeeId`) REFERENCES `payees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_miscs_SiteId_foreign_idx` FOREIGN KEY (`SiteId`) REFERENCES `sites` (`Id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_records`
--

DROP TABLE IF EXISTS `attendance_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `AttendanceSheetId` int NOT NULL,
  `PayeeId` int NOT NULL,
  `SiteId` int NOT NULL,
  `AttendanceDate` date NOT NULL,
  `ShiftType` varchar(30) NOT NULL,
  `ShiftMultiplier` decimal(3,1) NOT NULL,
  `LabourCount` int NOT NULL DEFAULT '1',
  `RatePerShift` decimal(18,2) NOT NULL,
  `CalculatedAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `CreatedAt` datetime DEFAULT NULL,
  `PersonType` varchar(30) NOT NULL DEFAULT 'Mason',
  PRIMARY KEY (`id`),
  KEY `AttendanceSheetId` (`AttendanceSheetId`),
  KEY `PayeeId` (`PayeeId`),
  KEY `SiteId` (`SiteId`),
  CONSTRAINT `attendance_records_ibfk_1` FOREIGN KEY (`AttendanceSheetId`) REFERENCES `attendance_sheets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_ibfk_2` FOREIGN KEY (`PayeeId`) REFERENCES `payees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `attendance_records_ibfk_3` FOREIGN KEY (`SiteId`) REFERENCES `sites` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `attendance_sheets`
--

DROP TABLE IF EXISTS `attendance_sheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance_sheets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `Title` varchar(100) NOT NULL,
  `WeekStartDate` date NOT NULL,
  `WeekEndDate` date NOT NULL,
  `Status` varchar(20) DEFAULT 'Open',
  `SelectedPayeeIds` text,
  `SelectedSiteIds` text,
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `clients`
--

DROP TABLE IF EXISTS `clients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clients` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `MobileNumber` varchar(15) NOT NULL,
  `PaymentType` varchar(50) DEFAULT 'Cash',
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_clients_MobileNumber` (`MobileNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `labours`
--

DROP TABLE IF EXISTS `labours`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `labours` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `MobileNo` varchar(15) NOT NULL,
  `AccountNo` varchar(30) DEFAULT '',
  `LabourType` varchar(50) NOT NULL,
  `CreatedAt` datetime DEFAULT NULL,
  `PayeeId` int DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_labours_LabourType` (`LabourType`)
) ENGINE=InnoDB AUTO_INCREMENT=459 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `material_types`
--

DROP TABLE IF EXISTS `material_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `material_types` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `SortOrder` int NOT NULL DEFAULT '0',
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Name` (`Name`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `materials`
--

DROP TABLE IF EXISTS `materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materials` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `CreatedAt` datetime DEFAULT NULL,
  `DealerName` varchar(100) DEFAULT '',
  `MobileNo` varchar(15) DEFAULT '',
  `AccountNo` varchar(30) DEFAULT '',
  `MaterialTypeId` int DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payees`
--

DROP TABLE IF EXISTS `payees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `Type` varchar(30) NOT NULL DEFAULT 'Labour',
  `MobileNo` varchar(15) DEFAULT '',
  `AccountNo` varchar(30) DEFAULT '',
  `Notes` varchar(500) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=669 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `PaymentCategory` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `SiteId` int NOT NULL,
  `LabourId` int DEFAULT NULL,
  `MaterialId` int DEFAULT NULL,
  `Amount` decimal(18,2) NOT NULL,
  `PaymentMode` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `PaymentDate` datetime(6) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  `PayeeId` int DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_payments_LabourId` (`LabourId`),
  KEY `IX_payments_MaterialId` (`MaterialId`),
  KEY `IX_payments_PaymentCategory` (`PaymentCategory`),
  KEY `IX_payments_PaymentDate` (`PaymentDate`),
  KEY `IX_payments_SiteId` (`SiteId`),
  CONSTRAINT `FK_payments_labours_LabourId` FOREIGN KEY (`LabourId`) REFERENCES `labours` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_payments_materials_MaterialId` FOREIGN KEY (`MaterialId`) REFERENCES `materials` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_payments_sites_SiteId` FOREIGN KEY (`SiteId`) REFERENCES `sites` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=3771 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `person_types`
--

DROP TABLE IF EXISTS `person_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `person_types` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(50) NOT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `SortOrder` int NOT NULL DEFAULT '0',
  `CreatedAt` datetime DEFAULT NULL,
  `DailyRate` decimal(18,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`Id`),
  UNIQUE KEY `Name` (`Name`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `personal_expenses`
--

DROP TABLE IF EXISTS `personal_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_expenses` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Description` varchar(255) NOT NULL,
  `Amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `ExpenseDate` date NOT NULL,
  `Category` varchar(100) NOT NULL,
  `Notes` varchar(500) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `petty_cash_transactions`
--

DROP TABLE IF EXISTS `petty_cash_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `petty_cash_transactions` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `WeeklyPaySheetId` int DEFAULT NULL,
  `WeekDate` date DEFAULT NULL,
  `TotalIncome` decimal(18,2) NOT NULL DEFAULT '0.00',
  `TotalExpense` decimal(18,2) NOT NULL DEFAULT '0.00',
  `ExtraPayments` decimal(18,2) NOT NULL DEFAULT '0.00',
  `ProfitAmount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `RunningBalance` decimal(18,2) NOT NULL DEFAULT '0.00',
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `WeeklyPaySheetId` (`WeeklyPaySheetId`),
  CONSTRAINT `petty_cash_transactions_ibfk_1` FOREIGN KEY (`WeeklyPaySheetId`) REFERENCES `weekly_pay_sheets` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `shift_masters`
--

DROP TABLE IF EXISTS `shift_masters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shift_masters` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ShiftType` varchar(30) NOT NULL,
  `ShiftMultiplier` decimal(3,1) NOT NULL,
  `Rate` decimal(18,2) NOT NULL DEFAULT '0.00',
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `site_materials`
--

DROP TABLE IF EXISTS `site_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_materials` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `SiteId` int NOT NULL,
  `MaterialId` int NOT NULL,
  `Quantity` decimal(18,2) NOT NULL,
  `Unit` varchar(30) NOT NULL,
  `PurchaseDate` datetime DEFAULT NULL,
  `Amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `DealerName` varchar(100) DEFAULT '',
  PRIMARY KEY (`Id`),
  KEY `IX_site_materials_MaterialId` (`MaterialId`),
  KEY `IX_site_materials_SiteId` (`SiteId`),
  CONSTRAINT `site_materials_ibfk_13` FOREIGN KEY (`SiteId`) REFERENCES `sites` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_site_materials_material_type` FOREIGN KEY (`MaterialId`) REFERENCES `material_types` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=883 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `site_work_values`
--

DROP TABLE IF EXISTS `site_work_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_work_values` (
  `id` int NOT NULL AUTO_INCREMENT,
  `SiteId` int NOT NULL,
  `WorkName` varchar(150) NOT NULL,
  `Value` decimal(18,2) NOT NULL DEFAULT '0.00',
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `SiteId` (`SiteId`),
  CONSTRAINT `site_work_values_ibfk_1` FOREIGN KEY (`SiteId`) REFERENCES `sites` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sites`
--

DROP TABLE IF EXISTS `sites`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sites` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `SiteName` varchar(150) NOT NULL,
  `ClientId` int NOT NULL,
  `SiteValue` decimal(18,2) NOT NULL,
  `Length` decimal(10,2) NOT NULL,
  `Breadth` decimal(10,2) NOT NULL,
  `Facing` varchar(10) DEFAULT '',
  `Status` varchar(20) DEFAULT 'Upcoming',
  `CreatedAt` datetime DEFAULT NULL,
  `Progress` decimal(5,2) DEFAULT '0.00',
  `NextMilestone` varchar(255) DEFAULT '',
  PRIMARY KEY (`Id`),
  KEY `IX_sites_ClientId` (`ClientId`),
  KEY `IX_sites_Status` (`Status`),
  CONSTRAINT `sites_ibfk_1` FOREIGN KEY (`ClientId`) REFERENCES `clients` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=72 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `PasswordHash` varchar(200) NOT NULL,
  `Role` varchar(10) NOT NULL DEFAULT 'EMP',
  `FullName` varchar(100) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_users_Username` (`Username`),
  UNIQUE KEY `Username` (`Username`),
  UNIQUE KEY `Username_2` (`Username`),
  UNIQUE KEY `Username_3` (`Username`),
  UNIQUE KEY `Username_4` (`Username`),
  UNIQUE KEY `Username_5` (`Username`),
  UNIQUE KEY `Username_6` (`Username`),
  UNIQUE KEY `Username_7` (`Username`),
  UNIQUE KEY `Username_8` (`Username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_pay_sheet_items`
--

DROP TABLE IF EXISTS `weekly_pay_sheet_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_pay_sheet_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `WeeklyPaySheetId` int NOT NULL,
  `PayeeId` int DEFAULT NULL,
  `SiteId` int NOT NULL,
  `Amount` decimal(18,2) NOT NULL DEFAULT '0.00',
  `PaymentStatus` varchar(20) DEFAULT 'Pending',
  `PaymentId` int DEFAULT NULL,
  `PaymentDate` datetime DEFAULT NULL,
  `PaymentMode` varchar(30) DEFAULT NULL,
  `PaymentNotes` varchar(500) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT NULL,
  `IsSkipped` tinyint(1) NOT NULL DEFAULT '0',
  `SkippedToSheetId` int DEFAULT NULL,
  `IsExtraPayment` tinyint(1) NOT NULL DEFAULT '0',
  `ExtraPaymentDescription` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `WeeklyPaySheetId` (`WeeklyPaySheetId`),
  KEY `PayeeId` (`PayeeId`),
  KEY `SiteId` (`SiteId`),
  KEY `PaymentId` (`PaymentId`),
  CONSTRAINT `weekly_pay_sheet_items_ibfk_1` FOREIGN KEY (`WeeklyPaySheetId`) REFERENCES `weekly_pay_sheets` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `weekly_pay_sheet_items_ibfk_2` FOREIGN KEY (`PayeeId`) REFERENCES `payees` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `weekly_pay_sheet_items_ibfk_3` FOREIGN KEY (`SiteId`) REFERENCES `sites` (`Id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `weekly_pay_sheet_items_ibfk_4` FOREIGN KEY (`PaymentId`) REFERENCES `payments` (`Id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3527 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `weekly_pay_sheets`
--

DROP TABLE IF EXISTS `weekly_pay_sheets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `weekly_pay_sheets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `Title` varchar(100) NOT NULL,
  `WeekDate` date NOT NULL,
  `Status` varchar(20) DEFAULT 'Open',
  `CreatedAt` datetime DEFAULT NULL,
  `SelectedPayeeIds` text,
  `SelectedSiteIds` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=188 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-22 13:24:26
