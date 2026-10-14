-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: food_supply_network
-- ------------------------------------------------------
-- Server version	26.7.0

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
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '7808fc64-9fbb-11f1-a916-7c10c9bb4d60:1-533';

--
-- Table structure for table `auditlog`
--

DROP TABLE IF EXISTS `auditlog`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditlog` (
  `LogID` bigint unsigned NOT NULL AUTO_INCREMENT,
  `UserID` int unsigned DEFAULT NULL,
  `Action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `TableName` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `LoggedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`LogID`),
  KEY `fk_audit_user` (`UserID`),
  CONSTRAINT `fk_audit_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditlog`
--

LOCK TABLES `auditlog` WRITE;
/*!40000 ALTER TABLE `auditlog` DISABLE KEYS */;
INSERT INTO `auditlog` VALUES (1,2,'INSERT','Orders','2026-10-09 05:24:47'),(2,3,'INSERT','Orders','2026-10-09 05:24:47'),(3,5,'UPDATE','Product','2026-10-09 05:24:47'),(4,1,'UPDATE','Users','2026-10-09 05:24:47'),(5,4,'INSERT','Orders','2026-10-09 05:24:47'),(6,2,'INSERT','Orders','2026-10-09 06:22:37'),(7,2,'UPDATE','Product','2026-10-14 14:49:42'),(8,2,'INSERT','Orders','2026-10-14 14:49:42'),(9,2,'UPDATE','Product','2026-10-14 14:52:23'),(10,2,'INSERT','Orders','2026-10-14 14:52:23'),(11,2,'DELIVERY_InTransit','Delivery','2026-10-14 15:07:17'),(12,2,'INVOICE_Paid','Invoice','2026-10-14 15:07:27'),(13,2,'INSERT','Product','2026-10-14 15:10:28'),(14,2,'UPDATE','Product','2026-10-14 15:10:42'),(15,2,'UPDATE','Product','2026-10-14 15:10:50'),(16,2,'STATUS_Cancelled','Orders','2026-10-14 15:10:50'),(17,2,'STATUS_Cancelled','Orders','2026-10-14 15:10:50');
/*!40000 ALTER TABLE `auditlog` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `category`
--

DROP TABLE IF EXISTS `category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category` (
  `CategoryID` int unsigned NOT NULL AUTO_INCREMENT,
  `CategoryName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`CategoryID`),
  UNIQUE KEY `uq_category_name` (`CategoryName`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `category`
--

LOCK TABLES `category` WRITE;
/*!40000 ALTER TABLE `category` DISABLE KEYS */;
INSERT INTO `category` VALUES (1,'Meat','Pork, chicken, beef and other meats'),(2,'Vegetables','Fresh vegetables'),(3,'Dairy','Milk, cheese and other dairy products'),(4,'Dry Goods','Rice, cooking oil and pantry items');
/*!40000 ALTER TABLE `category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dbaccountmap`
--

DROP TABLE IF EXISTS `dbaccountmap`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dbaccountmap` (
  `DbUser` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `UserID` int unsigned NOT NULL,
  PRIMARY KEY (`DbUser`),
  UNIQUE KEY `uq_map_user` (`UserID`),
  CONSTRAINT `fk_map_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dbaccountmap`
--

LOCK TABLES `dbaccountmap` WRITE;
/*!40000 ALTER TABLE `dbaccountmap` DISABLE KEYS */;
INSERT INTO `dbaccountmap` VALUES ('tenant1_maria',2),('tenant2_lola',3),('tenant3_jun',4),('supplier1_ramon',5),('supplier2_ana',6),('supplier3_pedro',7);
/*!40000 ALTER TABLE `dbaccountmap` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `delivery`
--

DROP TABLE IF EXISTS `delivery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delivery` (
  `DeliveryID` int unsigned NOT NULL AUTO_INCREMENT,
  `OrderID` int unsigned NOT NULL,
  `ScheduledDate` datetime NOT NULL,
  `Status` enum('Scheduled','InTransit','Delivered','Failed','Rescheduled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Scheduled',
  PRIMARY KEY (`DeliveryID`),
  KEY `fk_delivery_order` (`OrderID`),
  CONSTRAINT `fk_delivery_order` FOREIGN KEY (`OrderID`) REFERENCES `orders` (`OrderID`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `delivery`
--

LOCK TABLES `delivery` WRITE;
/*!40000 ALTER TABLE `delivery` DISABLE KEYS */;
INSERT INTO `delivery` VALUES (1,1,'2026-09-22 08:00:00','Delivered'),(2,2,'2026-09-27 08:00:00','Delivered'),(3,3,'2026-10-14 23:07:17','InTransit'),(4,4,'2026-10-10 08:00:00','Scheduled'),(5,5,'2026-10-12 08:00:00','Scheduled');
/*!40000 ALTER TABLE `delivery` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoice`
--

DROP TABLE IF EXISTS `invoice`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoice` (
  `InvoiceID` int unsigned NOT NULL AUTO_INCREMENT,
  `OrderID` int unsigned NOT NULL,
  `InvoiceDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Amount` decimal(12,2) NOT NULL,
  `PaymentStatus` enum('Unpaid','Paid','Overdue','Refunded') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Unpaid',
  PRIMARY KEY (`InvoiceID`),
  UNIQUE KEY `uq_invoice_order` (`OrderID`),
  CONSTRAINT `fk_invoice_order` FOREIGN KEY (`OrderID`) REFERENCES `orders` (`OrderID`),
  CONSTRAINT `chk_invoice_amount` CHECK ((`Amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoice`
--

LOCK TABLES `invoice` WRITE;
/*!40000 ALTER TABLE `invoice` DISABLE KEYS */;
INSERT INTO `invoice` VALUES (1,1,'2026-09-20 09:30:00',11300.00,'Paid'),(2,2,'2026-09-25 10:45:00',1800.00,'Overdue'),(3,3,'2026-10-01 09:00:00',7400.00,'Paid'),(4,4,'2026-10-03 14:15:00',4300.00,'Unpaid'),(5,5,'2026-10-05 11:30:00',3300.00,'Unpaid');
/*!40000 ALTER TABLE `invoice` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orderdetail`
--

DROP TABLE IF EXISTS `orderdetail`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orderdetail` (
  `OrderDetailID` int unsigned NOT NULL AUTO_INCREMENT,
  `OrderID` int unsigned NOT NULL,
  `ProductID` int unsigned NOT NULL,
  `Quantity` int NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  PRIMARY KEY (`OrderDetailID`),
  UNIQUE KEY `uq_order_product` (`OrderID`,`ProductID`),
  KEY `fk_od_product` (`ProductID`),
  CONSTRAINT `fk_od_order` FOREIGN KEY (`OrderID`) REFERENCES `orders` (`OrderID`),
  CONSTRAINT `fk_od_product` FOREIGN KEY (`ProductID`) REFERENCES `product` (`ProductID`),
  CONSTRAINT `chk_od_price` CHECK ((`Price` >= 0)),
  CONSTRAINT `chk_od_qty` CHECK ((`Quantity` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orderdetail`
--

LOCK TABLES `orderdetail` WRITE;
/*!40000 ALTER TABLE `orderdetail` DISABLE KEYS */;
INSERT INTO `orderdetail` VALUES (1,1,1,20,280.00),(2,1,2,30,190.00),(3,2,4,15,60.00),(4,2,5,10,90.00),(5,3,3,10,360.00),(6,3,2,20,190.00),(7,4,9,2,1350.00),(8,4,10,1,1600.00),(9,5,7,24,85.00),(10,5,8,3,420.00),(11,6,6,20,45.00),(12,7,9,1,1350.00),(13,8,4,5,60.00),(14,9,1,5,280.00),(15,10,1,5,280.00);
/*!40000 ALTER TABLE `orderdetail` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_orderdetail_after_insert` AFTER INSERT ON `orderdetail` FOR EACH ROW BEGIN
    UPDATE `product`
    SET `Stock` = `Stock` - NEW.`Quantity`
    WHERE `ProductID` = NEW.`ProductID`;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `OrderID` int unsigned NOT NULL AUTO_INCREMENT,
  `TenantID` int unsigned NOT NULL,
  `SupplierID` int unsigned NOT NULL,
  `UserID` int unsigned NOT NULL,
  `OrderDate` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Status` enum('Pending','Confirmed','Shipped','Delivered','Cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pending',
  `TotalAmount` decimal(12,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`OrderID`),
  KEY `fk_orders_tenant` (`TenantID`),
  KEY `fk_orders_supplier` (`SupplierID`),
  KEY `fk_orders_user` (`UserID`),
  KEY `idx_orders_tenant_status_date` (`TenantID`,`Status`,`OrderDate` DESC),
  KEY `idx_orders_supplier_status` (`SupplierID`,`Status`,`TotalAmount`),
  CONSTRAINT `fk_orders_supplier` FOREIGN KEY (`SupplierID`) REFERENCES `supplier` (`SupplierID`),
  CONSTRAINT `fk_orders_tenant` FOREIGN KEY (`TenantID`) REFERENCES `tenant` (`TenantID`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`),
  CONSTRAINT `chk_orders_total` CHECK ((`TotalAmount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,1,1,2,'2026-09-20 09:15:00','Delivered',11300.00),(2,1,2,2,'2026-09-25 10:30:00','Delivered',1800.00),(3,2,1,3,'2026-10-01 08:45:00','Delivered',7400.00),(4,2,3,3,'2026-10-03 14:00:00','Confirmed',4300.00),(5,3,3,4,'2026-10-05 11:20:00','Pending',3300.00),(6,3,2,4,'2026-10-06 16:10:00','Cancelled',900.00),(7,1,3,2,'2026-10-07 09:00:00','Pending',1350.00),(8,1,2,2,'2026-10-09 14:22:37','Cancelled',300.00),(9,1,1,2,'2026-10-14 22:49:42','Pending',1400.00),(10,1,1,2,'2026-10-14 22:52:23','Pending',1400.00);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_orders_after_update` AFTER UPDATE ON `orders` FOR EACH ROW BEGIN
    IF OLD.`Status` <> NEW.`Status` THEN
        INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
        VALUES (fn_current_user_id(), CONCAT('STATUS_', NEW.`Status`), 'Orders', NOW());
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `product`
--

DROP TABLE IF EXISTS `product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product` (
  `ProductID` int unsigned NOT NULL AUTO_INCREMENT,
  `SupplierID` int unsigned NOT NULL,
  `CategoryID` int unsigned NOT NULL,
  `ProductName` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `Stock` int NOT NULL DEFAULT '0',
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ProductID`),
  KEY `fk_product_supplier` (`SupplierID`),
  KEY `fk_product_category` (`CategoryID`),
  KEY `idx_product_supplier_category_price` (`SupplierID`,`CategoryID`,`IsActive`,`Price`),
  CONSTRAINT `fk_product_category` FOREIGN KEY (`CategoryID`) REFERENCES `category` (`CategoryID`),
  CONSTRAINT `fk_product_supplier` FOREIGN KEY (`SupplierID`) REFERENCES `supplier` (`SupplierID`),
  CONSTRAINT `chk_product_price` CHECK ((`Price` >= 0)),
  CONSTRAINT `chk_product_stock` CHECK ((`Stock` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product`
--

LOCK TABLES `product` WRITE;
/*!40000 ALTER TABLE `product` DISABLE KEYS */;
INSERT INTO `product` VALUES (1,1,1,'Pork Belly (per kg)',285.00,150,1,'2026-10-09 05:24:47'),(2,1,1,'Whole Chicken (per kg)',190.00,200,1,'2026-10-09 05:24:47'),(3,1,1,'Beef Chuck (per kg)',360.00,80,1,'2026-10-09 05:24:47'),(4,2,2,'Tomatoes (per kg)',60.00,300,1,'2026-10-09 05:24:47'),(5,2,2,'Red Onions (per kg)',90.00,250,1,'2026-10-09 05:24:47'),(6,2,2,'Cabbage (per kg)',45.00,180,1,'2026-10-09 05:24:47'),(7,3,3,'Fresh Milk (1 L)',85.00,120,1,'2026-10-09 05:24:47'),(8,3,3,'Cheddar Cheese (per kg)',420.00,40,1,'2026-10-09 05:24:47'),(9,3,4,'Jasmine Rice (25 kg sack)',1350.00,60,1,'2026-10-09 05:24:47'),(10,3,4,'Cooking Oil (18 L can)',1600.00,5,1,'2026-10-09 05:24:47'),(11,1,1,'Pork Liver (per kg)',150.00,40,1,'2026-10-09 06:31:31'),(12,1,1,'Premium Pork Chops (per kg)',310.00,50,1,'2026-10-14 15:10:28');
/*!40000 ALTER TABLE `product` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 DEFINER=`root`@`localhost`*/ /*!50003 TRIGGER `trg_product_after_update` AFTER UPDATE ON `product` FOR EACH ROW BEGIN
    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (fn_current_user_id(), 'UPDATE', 'Product', NOW());
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `supplier`
--

DROP TABLE IF EXISTS `supplier`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier` (
  `SupplierID` int unsigned NOT NULL AUTO_INCREMENT,
  `SupplierName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ContactNo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`SupplierID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplier`
--

LOCK TABLES `supplier` WRITE;
/*!40000 ALTER TABLE `supplier` DISABLE KEYS */;
INSERT INTO `supplier` VALUES (1,'Tagbilaran Fresh Meats','0928-222-0001','Brgy. Booy, Tagbilaran City, Bohol',1,'2026-10-09 05:24:47'),(2,'Bohol Green Farms','0928-222-0002','Brgy. Taloto, Tagbilaran City, Bohol',1,'2026-10-09 05:24:47'),(3,'Bohol Dairy and Dry Goods','0928-222-0003','Brgy. Mansasa, Tagbilaran City, Bohol',1,'2026-10-09 05:24:47');
/*!40000 ALTER TABLE `supplier` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tenant`
--

DROP TABLE IF EXISTS `tenant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tenant` (
  `TenantID` int unsigned NOT NULL AUTO_INCREMENT,
  `BusinessName` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `StallNumber` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ContactNo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`TenantID`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tenant`
--

LOCK TABLES `tenant` WRITE;
/*!40000 ALTER TABLE `tenant` DISABLE KEYS */;
INSERT INTO `tenant` VALUES (1,'Kusina ni Maria','A-12','0917-111-0001','Agora Public Market, Tagbilaran City, Bohol',1,'2026-10-09 05:24:47'),(2,'Lolas Grill House','B-03','0917-111-0002','Dampas District, Tagbilaran City, Bohol',1,'2026-10-09 05:24:47'),(3,'Island Bites Cafe','C-21','0917-111-0003','CPG Avenue, Poblacion, Tagbilaran City, Bohol',1,'2026-10-09 05:24:47');
/*!40000 ALTER TABLE `tenant` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `UserID` int unsigned NOT NULL AUTO_INCREMENT,
  `TenantID` int unsigned DEFAULT NULL,
  `SupplierID` int unsigned DEFAULT NULL,
  `Name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `Email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `PasswordHash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `ContactNo` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `Role` enum('Admin','BusinessOwner','Supplier') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `IsActive` tinyint(1) NOT NULL DEFAULT '1',
  `CreatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `uq_users_email` (`Email`),
  KEY `fk_users_tenant` (`TenantID`),
  KEY `fk_users_supplier` (`SupplierID`),
  CONSTRAINT `fk_users_supplier` FOREIGN KEY (`SupplierID`) REFERENCES `supplier` (`SupplierID`),
  CONSTRAINT `fk_users_tenant` FOREIGN KEY (`TenantID`) REFERENCES `tenant` (`TenantID`),
  CONSTRAINT `chk_users_role` CHECK ((((`Role` = _utf8mb4'Admin') and (`TenantID` is null) and (`SupplierID` is null)) or ((`Role` = _utf8mb4'BusinessOwner') and (`TenantID` is not null) and (`SupplierID` is null)) or ((`Role` = _utf8mb4'Supplier') and (`SupplierID` is not null) and (`TenantID` is null))))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,NULL,NULL,'System Admin','admin@foodnet.test','FAKE_HASH_admin','0900-000-0000','Admin',1,'2026-10-09 05:24:47'),(2,1,NULL,'Maria Santos','maria@kusina.test','FAKE_HASH_maria','0917-111-0001','BusinessOwner',1,'2026-10-09 05:24:47'),(3,2,NULL,'Lola Remedios','lola@lolasgrill.test','FAKE_HASH_lola','0917-111-0002','BusinessOwner',1,'2026-10-09 05:24:47'),(4,3,NULL,'Jun Dela Cruz','jun@islandbites.test','FAKE_HASH_jun','0917-111-0003','BusinessOwner',1,'2026-10-09 05:24:47'),(5,NULL,1,'Ramon Villaflor','ramon@tagmeats.test','FAKE_HASH_ramon','0928-222-0001','Supplier',1,'2026-10-09 05:24:47'),(6,NULL,2,'Ana Cabahug','ana@boholgreen.test','FAKE_HASH_ana','0928-222-0002','Supplier',1,'2026-10-09 05:24:47'),(7,NULL,3,'Pedro Uy','pedro@boholdairy.test','FAKE_HASH_pedro','0928-222-0003','Supplier',1,'2026-10-09 05:24:47');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_admin_low_stock`
--

DROP TABLE IF EXISTS `v_admin_low_stock`;
/*!50001 DROP VIEW IF EXISTS `v_admin_low_stock`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_admin_low_stock` AS SELECT 
 1 AS `ProductID`,
 1 AS `ProductName`,
 1 AS `SupplierName`,
 1 AS `Stock`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_admin_orders_by_status`
--

DROP TABLE IF EXISTS `v_admin_orders_by_status`;
/*!50001 DROP VIEW IF EXISTS `v_admin_orders_by_status`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_admin_orders_by_status` AS SELECT 
 1 AS `Status`,
 1 AS `OrderCount`,
 1 AS `TotalValue`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_admin_overdue_invoices`
--

DROP TABLE IF EXISTS `v_admin_overdue_invoices`;
/*!50001 DROP VIEW IF EXISTS `v_admin_overdue_invoices`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_admin_overdue_invoices` AS SELECT 
 1 AS `InvoiceID`,
 1 AS `OrderID`,
 1 AS `Tenant`,
 1 AS `Supplier`,
 1 AS `InvoiceDate`,
 1 AS `Amount`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_admin_supplier_ranking`
--

DROP TABLE IF EXISTS `v_admin_supplier_ranking`;
/*!50001 DROP VIEW IF EXISTS `v_admin_supplier_ranking`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_admin_supplier_ranking` AS SELECT 
 1 AS `SupplierID`,
 1 AS `SupplierName`,
 1 AS `OrderCount`,
 1 AS `Revenue`,
 1 AS `RevenueRank`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_admin_system_summary`
--

DROP TABLE IF EXISTS `v_admin_system_summary`;
/*!50001 DROP VIEW IF EXISTS `v_admin_system_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_admin_system_summary` AS SELECT 
 1 AS `ActiveTenants`,
 1 AS `ActiveSuppliers`,
 1 AS `ActiveUsers`,
 1 AS `TotalOrders`,
 1 AS `TotalOrderValue`,
 1 AS `OutstandingInvoices`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_catalog`
--

DROP TABLE IF EXISTS `v_catalog`;
/*!50001 DROP VIEW IF EXISTS `v_catalog`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_catalog` AS SELECT 
 1 AS `ProductID`,
 1 AS `ProductName`,
 1 AS `CategoryName`,
 1 AS `SupplierID`,
 1 AS `SupplierName`,
 1 AS `Price`,
 1 AS `Stock`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_categories`
--

DROP TABLE IF EXISTS `v_categories`;
/*!50001 DROP VIEW IF EXISTS `v_categories`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_categories` AS SELECT 
 1 AS `CategoryID`,
 1 AS `CategoryName`,
 1 AS `Description`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_deliveries`
--

DROP TABLE IF EXISTS `v_supplier_deliveries`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_deliveries`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_deliveries` AS SELECT 
 1 AS `DeliveryID`,
 1 AS `OrderID`,
 1 AS `ScheduledDate`,
 1 AS `Status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_invoices`
--

DROP TABLE IF EXISTS `v_supplier_invoices`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_invoices`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_invoices` AS SELECT 
 1 AS `InvoiceID`,
 1 AS `OrderID`,
 1 AS `InvoiceDate`,
 1 AS `Amount`,
 1 AS `PaymentStatus`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_low_stock`
--

DROP TABLE IF EXISTS `v_supplier_low_stock`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_low_stock`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_low_stock` AS SELECT 
 1 AS `ProductID`,
 1 AS `ProductName`,
 1 AS `Stock`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_order_details`
--

DROP TABLE IF EXISTS `v_supplier_order_details`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_order_details`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_order_details` AS SELECT 
 1 AS `OrderDetailID`,
 1 AS `OrderID`,
 1 AS `ProductID`,
 1 AS `ProductName`,
 1 AS `Quantity`,
 1 AS `Price`,
 1 AS `LineTotal`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_orders`
--

DROP TABLE IF EXISTS `v_supplier_orders`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_orders`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_orders` AS SELECT 
 1 AS `OrderID`,
 1 AS `OrderDate`,
 1 AS `Status`,
 1 AS `TotalAmount`,
 1 AS `BusinessName`,
 1 AS `StallNumber`,
 1 AS `ContactNo`,
 1 AS `Address`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_payment_summary`
--

DROP TABLE IF EXISTS `v_supplier_payment_summary`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_payment_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_payment_summary` AS SELECT 
 1 AS `PaymentStatus`,
 1 AS `InvoiceCount`,
 1 AS `TotalAmount`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_products`
--

DROP TABLE IF EXISTS `v_supplier_products`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_products`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_products` AS SELECT 
 1 AS `ProductID`,
 1 AS `SupplierID`,
 1 AS `CategoryID`,
 1 AS `ProductName`,
 1 AS `Price`,
 1 AS `Stock`,
 1 AS `IsActive`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_sales_by_product`
--

DROP TABLE IF EXISTS `v_supplier_sales_by_product`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_sales_by_product`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_sales_by_product` AS SELECT 
 1 AS `ProductID`,
 1 AS `ProductName`,
 1 AS `UnitsSold`,
 1 AS `Revenue`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_supplier_top_customers`
--

DROP TABLE IF EXISTS `v_supplier_top_customers`;
/*!50001 DROP VIEW IF EXISTS `v_supplier_top_customers`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_supplier_top_customers` AS SELECT 
 1 AS `TenantID`,
 1 AS `BusinessName`,
 1 AS `OrderCount`,
 1 AS `TotalBought`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_deliveries`
--

DROP TABLE IF EXISTS `v_tenant_deliveries`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_deliveries`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_deliveries` AS SELECT 
 1 AS `DeliveryID`,
 1 AS `OrderID`,
 1 AS `ScheduledDate`,
 1 AS `Status`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_invoices`
--

DROP TABLE IF EXISTS `v_tenant_invoices`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_invoices`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_invoices` AS SELECT 
 1 AS `InvoiceID`,
 1 AS `OrderID`,
 1 AS `InvoiceDate`,
 1 AS `Amount`,
 1 AS `PaymentStatus`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_monthly_spending`
--

DROP TABLE IF EXISTS `v_tenant_monthly_spending`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_monthly_spending`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_monthly_spending` AS SELECT 
 1 AS `OrderMonth`,
 1 AS `OrderCount`,
 1 AS `TotalSpent`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_order_details`
--

DROP TABLE IF EXISTS `v_tenant_order_details`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_order_details`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_order_details` AS SELECT 
 1 AS `OrderDetailID`,
 1 AS `OrderID`,
 1 AS `ProductID`,
 1 AS `ProductName`,
 1 AS `Quantity`,
 1 AS `Price`,
 1 AS `LineTotal`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_orders`
--

DROP TABLE IF EXISTS `v_tenant_orders`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_orders`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_orders` AS SELECT 
 1 AS `OrderID`,
 1 AS `TenantID`,
 1 AS `SupplierID`,
 1 AS `UserID`,
 1 AS `OrderDate`,
 1 AS `Status`,
 1 AS `TotalAmount`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_payment_summary`
--

DROP TABLE IF EXISTS `v_tenant_payment_summary`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_payment_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_payment_summary` AS SELECT 
 1 AS `PaymentStatus`,
 1 AS `InvoiceCount`,
 1 AS `TotalAmount`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_spending_by_supplier`
--

DROP TABLE IF EXISTS `v_tenant_spending_by_supplier`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_spending_by_supplier`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_spending_by_supplier` AS SELECT 
 1 AS `SupplierID`,
 1 AS `SupplierName`,
 1 AS `OrderCount`,
 1 AS `TotalSpent`,
 1 AS `AvgOrderValue`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `v_tenant_supplier_performance`
--

DROP TABLE IF EXISTS `v_tenant_supplier_performance`;
/*!50001 DROP VIEW IF EXISTS `v_tenant_supplier_performance`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_tenant_supplier_performance` AS SELECT 
 1 AS `SupplierID`,
 1 AS `SupplierName`,
 1 AS `TotalOrders`,
 1 AS `DeliveredOrders`,
 1 AS `CancelledOrders`,
 1 AS `DeliveredPercent`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'food_supply_network'
--

--
-- Dumping routines for database 'food_supply_network'
--
/*!50003 DROP FUNCTION IF EXISTS `fn_current_supplier_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_current_supplier_id`() RETURNS int unsigned
    READS SQL DATA
BEGIN
    RETURN (SELECT u.SupplierID
            FROM DbAccountMap m
            JOIN Users u ON u.UserID = m.UserID
            WHERE m.DbUser = SUBSTRING_INDEX(USER(), '@', 1)
              AND u.IsActive = TRUE
            LIMIT 1);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `fn_current_tenant_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_current_tenant_id`() RETURNS int unsigned
    READS SQL DATA
BEGIN
    RETURN (SELECT u.TenantID
            FROM DbAccountMap m
            JOIN Users u ON u.UserID = m.UserID
            WHERE m.DbUser = SUBSTRING_INDEX(USER(), '@', 1)
              AND u.IsActive = TRUE
            LIMIT 1);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `fn_current_user_id` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` FUNCTION `fn_current_user_id`() RETURNS int unsigned
    READS SQL DATA
BEGIN
    RETURN (SELECT u.UserID
            FROM DbAccountMap m
            JOIN Users u ON u.UserID = m.UserID
            WHERE m.DbUser = SUBSTRING_INDEX(USER(), '@', 1)
              AND u.IsActive = TRUE
            LIMIT 1);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_add_product` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_add_product`(
    IN p_category_id INT UNSIGNED,
    IN p_product_name VARCHAR(150),
    IN p_price DECIMAL(10,2),
    IN p_stock INT
)
BEGIN
    DECLARE v_supplier_id INT UNSIGNED;
    DECLARE v_new_product_id INT UNSIGNED;
    DECLARE v_user_id INT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_supplier_id = fn_current_supplier_id();
    SET v_user_id     = fn_current_user_id();

    IF v_supplier_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only active suppliers can add products to the catalog.';
    END IF;

    IF p_price IS NULL OR p_price < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Product price must be greater than or equal to zero.';
    END IF;

    IF p_stock IS NULL OR p_stock < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Stock quantity cannot be negative.';
    END IF;

    START TRANSACTION;

    INSERT INTO `product` (`SupplierID`, `CategoryID`, `ProductName`, `Price`, `Stock`, `IsActive`)
    VALUES (v_supplier_id, p_category_id, p_product_name, p_price, p_stock, 1);

    SET v_new_product_id = LAST_INSERT_ID();

    -- Log insertion into AuditLog
    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, 'INSERT', 'Product', NOW());

    COMMIT;

    SELECT v_new_product_id AS NewProductID, p_product_name AS ProductName, p_price AS Price, p_stock AS Stock;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_cancel_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cancel_order`(
    IN p_order_id INT UNSIGNED
)
BEGIN
    DECLARE v_status ENUM('Pending','Confirmed','Shipped','Delivered','Cancelled');
    DECLARE v_user_id INT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_user_id = fn_current_user_id();

    START TRANSACTION;

    SELECT `Status` INTO v_status
      FROM `orders`
     WHERE `OrderID` = p_order_id
       FOR UPDATE;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order ID not found.';
    END IF;

    IF v_status = 'Cancelled' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order is already cancelled.';
    ELSEIF v_status = 'Delivered' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot cancel an order that has already been delivered.';
    END IF;

    -- Revert deducted inventory back into stock
    UPDATE `product` p
    JOIN `orderdetail` od ON od.`ProductID` = p.`ProductID`
       SET p.`Stock` = p.`Stock` + od.`Quantity`
     WHERE od.`OrderID` = p_order_id;

    -- Set order status to Cancelled
    UPDATE `orders`
       SET `Status` = 'Cancelled'
     WHERE `OrderID` = p_order_id;

    -- Log cancellation event
    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, 'STATUS_Cancelled', 'Orders', NOW());

    COMMIT;

    SELECT p_order_id AS OrderID, 'Cancelled' AS Status, 'Stock successfully reverted' AS Result;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_complete_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_complete_order`(
    IN p_order_id INT UNSIGNED
)
BEGIN
    DECLARE v_current_status ENUM('Pending','Confirmed','Shipped','Delivered','Cancelled');
    DECLARE v_total_amount DECIMAL(12,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT `Status`, `TotalAmount` 
      INTO v_current_status, v_total_amount
      FROM `orders`
     WHERE `OrderID` = p_order_id
       FOR UPDATE;

    IF v_current_status IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order ID not found.';
    END IF;

    IF v_current_status = 'Delivered' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Order is already marked as Delivered.';
    ELSEIF v_current_status = 'Cancelled' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot complete a cancelled order.';
    END IF;

    UPDATE `orders`
       SET `Status` = 'Delivered'
     WHERE `OrderID` = p_order_id;

    IF EXISTS (SELECT 1 FROM `delivery` WHERE `OrderID` = p_order_id) THEN
        UPDATE `delivery`
           SET `Status` = 'Delivered'
         WHERE `OrderID` = p_order_id;
    ELSE
        INSERT INTO `delivery` (`OrderID`, `ScheduledDate`, `Status`)
        VALUES (p_order_id, NOW(), 'Delivered');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM `invoice` WHERE `OrderID` = p_order_id) THEN
        INSERT INTO `invoice` (`OrderID`, `InvoiceDate`, `Amount`, `PaymentStatus`)
        VALUES (p_order_id, NOW(), v_total_amount, 'Unpaid');
    END IF;

    COMMIT;

    SELECT o.`OrderID`, o.`Status` AS NewStatus, d.`Status` AS DeliveryStatus, i.`InvoiceID`, i.`PaymentStatus`
      FROM `orders` o
      LEFT JOIN `delivery` d ON d.`OrderID` = o.`OrderID`
      LEFT JOIN `invoice` i ON i.`OrderID` = o.`OrderID`
     WHERE o.`OrderID` = p_order_id;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_place_bulk_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_place_bulk_order`(
    IN p_product_id INT UNSIGNED,
    IN p_quantity INT
)
BEGIN
    DECLARE v_user_id     INT UNSIGNED;
    DECLARE v_tenant_id   INT UNSIGNED;
    DECLARE v_supplier_id INT UNSIGNED;
    DECLARE v_price       DECIMAL(10,2);
    DECLARE v_stock       INT;
    DECLARE v_order_id    INT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_user_id   = fn_current_user_id();
    SET v_tenant_id = fn_current_tenant_id();

    IF v_tenant_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only active business owners can place orders.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quantity must be greater than zero.';
    END IF;

    START TRANSACTION;

    SELECT p.`SupplierID`, p.`Price`, p.`Stock`
      INTO v_supplier_id, v_price, v_stock
      FROM `product` p
      JOIN `supplier` s ON s.`SupplierID` = p.`SupplierID`
     WHERE p.`ProductID` = p_product_id
       AND p.`IsActive` = TRUE
       AND s.`IsActive` = TRUE
       FOR UPDATE;

    IF v_supplier_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Product not found or unavailable.';
    END IF;

    IF v_stock < p_quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Not enough stock available.';
    END IF;

    INSERT INTO `orders` (`TenantID`, `SupplierID`, `UserID`, `TotalAmount`)
    VALUES (v_tenant_id, v_supplier_id, v_user_id, v_price * p_quantity);

    SET v_order_id = LAST_INSERT_ID();

    INSERT INTO `orderdetail` (`OrderID`, `ProductID`, `Quantity`, `Price`)
    VALUES (v_order_id, p_product_id, p_quantity, v_price);

    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, 'INSERT', 'Orders', NOW());

    COMMIT;

    SELECT v_order_id AS NewOrderID, (v_price * p_quantity) AS TotalAmount;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_place_order` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_place_order`(IN p_product_id INT UNSIGNED, IN p_quantity INT)
BEGIN
    DECLARE v_user_id     INT UNSIGNED;
    DECLARE v_tenant_id   INT UNSIGNED;
    DECLARE v_supplier_id INT UNSIGNED;
    DECLARE v_price       DECIMAL(10,2);
    DECLARE v_stock       INT;
    DECLARE v_order_id    INT UNSIGNED;

    -- If anything fails, undo everything and pass the error on.
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_user_id   = fn_current_user_id();
    SET v_tenant_id = fn_current_tenant_id();

    IF v_tenant_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Only active business owners can place orders.';
    END IF;

    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quantity must be greater than zero.';
    END IF;

    START TRANSACTION;

    -- FOR UPDATE locks the product row so two people cannot buy the last item at once.
    SELECT p.SupplierID, p.Price, p.Stock
      INTO v_supplier_id, v_price, v_stock
      FROM Product p
      JOIN Supplier s ON s.SupplierID = p.SupplierID
     WHERE p.ProductID = p_product_id
       AND p.IsActive = TRUE
       AND s.IsActive = TRUE
       FOR UPDATE;

    IF v_supplier_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Product not found or unavailable.';
    END IF;

    IF v_stock < p_quantity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Not enough stock available.';
    END IF;

    INSERT INTO Orders (TenantID, SupplierID, UserID, TotalAmount)
    VALUES (v_tenant_id, v_supplier_id, v_user_id, v_price * p_quantity);

    SET v_order_id = LAST_INSERT_ID();

    INSERT INTO OrderDetail (OrderID, ProductID, Quantity, Price)
    VALUES (v_order_id, p_product_id, p_quantity, v_price);

    UPDATE Product SET Stock = Stock - p_quantity WHERE ProductID = p_product_id;

    INSERT INTO AuditLog (UserID, Action, TableName)
    VALUES (v_user_id, 'INSERT', 'Orders');

    COMMIT;

    SELECT v_order_id AS NewOrderID, (v_price * p_quantity) AS TotalAmount;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_process_invoice_payment` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_process_invoice_payment`(
    IN p_invoice_id INT UNSIGNED,
    IN p_payment_status ENUM('Unpaid','Paid','Overdue','Refunded')
)
BEGIN
    DECLARE v_user_id INT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_user_id = fn_current_user_id();

    IF NOT EXISTS (SELECT 1 FROM `invoice` WHERE `InvoiceID` = p_invoice_id) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invoice ID not found.';
    END IF;

    START TRANSACTION;

    UPDATE `invoice`
       SET `PaymentStatus` = p_payment_status
     WHERE `InvoiceID` = p_invoice_id;

    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, CONCAT('INVOICE_', p_payment_status), 'Invoice', NOW());

    COMMIT;

    SELECT p_invoice_id AS InvoiceID, p_payment_status AS PaymentStatus;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_toggle_product_status` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_toggle_product_status`(
    IN p_product_id INT UNSIGNED,
    IN p_is_active TINYINT(1)
)
BEGIN
    DECLARE v_supplier_id INT UNSIGNED;
    DECLARE v_owner_supplier_id INT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_supplier_id = fn_current_supplier_id();

    SELECT `SupplierID` INTO v_owner_supplier_id
      FROM `product`
     WHERE `ProductID` = p_product_id;

    IF v_supplier_id IS NULL OR v_supplier_id <> v_owner_supplier_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Unauthorized. Product status can only be modified by its owner.';
    END IF;

    START TRANSACTION;

    UPDATE `product`
       SET `IsActive` = p_is_active
     WHERE `ProductID` = p_product_id;

    COMMIT;

    SELECT p_product_id AS ProductID, p_is_active AS IsActive;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_delivery_schedule` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_delivery_schedule`(
    IN p_delivery_id INT UNSIGNED,
    IN p_scheduled_date DATETIME,
    IN p_status ENUM('Scheduled','InTransit','Delivered','Failed','Rescheduled')
)
BEGIN
    DECLARE v_user_id INT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_user_id = fn_current_user_id();

    IF NOT EXISTS (SELECT 1 FROM `delivery` WHERE `DeliveryID` = p_delivery_id) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Delivery ID not found.';
    END IF;

    START TRANSACTION;

    UPDATE `delivery`
       SET `ScheduledDate` = p_scheduled_date,
           `Status`        = p_status
     WHERE `DeliveryID`    = p_delivery_id;

    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, CONCAT('DELIVERY_', p_status), 'Delivery', NOW());

    COMMIT;

    SELECT p_delivery_id AS DeliveryID, p_scheduled_date AS ScheduledDate, p_status AS Status;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sp_update_product_catalog` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_update_product_catalog`(
    IN p_product_id INT UNSIGNED,
    IN p_price DECIMAL(10,2),
    IN p_stock INT
)
BEGIN
    DECLARE v_supplier_id INT UNSIGNED;
    DECLARE v_owner_supplier_id INT UNSIGNED;
    DECLARE v_user_id INT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_supplier_id = fn_current_supplier_id();
    SET v_user_id     = fn_current_user_id();

    -- Check ownership
    SELECT `SupplierID` INTO v_owner_supplier_id
      FROM `product`
     WHERE `ProductID` = p_product_id;

    IF v_owner_supplier_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Product ID not found.';
    END IF;

    IF v_supplier_id IS NULL OR v_supplier_id <> v_owner_supplier_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Unauthorized. You can only update products in your own catalog.';
    END IF;

    START TRANSACTION;

    UPDATE `product`
       SET `Price` = p_price,
           `Stock` = p_stock
     WHERE `ProductID` = p_product_id;

    -- Audit trigger (trg_product_after_update) fires automatically on commit

    COMMIT;

    SELECT p_product_id AS ProductID, p_price AS UpdatedPrice, p_stock AS UpdatedStock;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Final view structure for view `v_admin_low_stock`
--

/*!50001 DROP VIEW IF EXISTS `v_admin_low_stock`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_admin_low_stock` AS select `p`.`ProductID` AS `ProductID`,`p`.`ProductName` AS `ProductName`,`s`.`SupplierName` AS `SupplierName`,`p`.`Stock` AS `Stock` from (`product` `p` join `supplier` `s` on((`s`.`SupplierID` = `p`.`SupplierID`))) where ((`p`.`IsActive` = true) and (`p`.`Stock` <= 20)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_admin_orders_by_status`
--

/*!50001 DROP VIEW IF EXISTS `v_admin_orders_by_status`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_admin_orders_by_status` AS select `orders`.`Status` AS `Status`,count(0) AS `OrderCount`,sum(`orders`.`TotalAmount`) AS `TotalValue` from `orders` group by `orders`.`Status` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_admin_overdue_invoices`
--

/*!50001 DROP VIEW IF EXISTS `v_admin_overdue_invoices`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_admin_overdue_invoices` AS select `i`.`InvoiceID` AS `InvoiceID`,`i`.`OrderID` AS `OrderID`,`t`.`BusinessName` AS `Tenant`,`s`.`SupplierName` AS `Supplier`,`i`.`InvoiceDate` AS `InvoiceDate`,`i`.`Amount` AS `Amount` from (((`invoice` `i` join `orders` `o` on((`o`.`OrderID` = `i`.`OrderID`))) join `tenant` `t` on((`t`.`TenantID` = `o`.`TenantID`))) join `supplier` `s` on((`s`.`SupplierID` = `o`.`SupplierID`))) where (`i`.`PaymentStatus` = 'Overdue') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_admin_supplier_ranking`
--

/*!50001 DROP VIEW IF EXISTS `v_admin_supplier_ranking`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_admin_supplier_ranking` AS select `s`.`SupplierID` AS `SupplierID`,`s`.`SupplierName` AS `SupplierName`,count(`o`.`OrderID`) AS `OrderCount`,coalesce(sum(`o`.`TotalAmount`),0) AS `Revenue`,rank() OVER (ORDER BY coalesce(sum(`o`.`TotalAmount`),0) desc )  AS `RevenueRank` from (`supplier` `s` left join `orders` `o` on(((`o`.`SupplierID` = `s`.`SupplierID`) and (`o`.`Status` <> 'Cancelled')))) group by `s`.`SupplierID`,`s`.`SupplierName` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_admin_system_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_admin_system_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_admin_system_summary` AS select (select count(0) from `tenant` where (`tenant`.`IsActive` = true)) AS `ActiveTenants`,(select count(0) from `supplier` where (`supplier`.`IsActive` = true)) AS `ActiveSuppliers`,(select count(0) from `users` where (`users`.`IsActive` = true)) AS `ActiveUsers`,(select count(0) from `orders`) AS `TotalOrders`,(select coalesce(sum(`orders`.`TotalAmount`),0) from `orders` where (`orders`.`Status` <> 'Cancelled')) AS `TotalOrderValue`,(select coalesce(sum(`invoice`.`Amount`),0) from `invoice` where (`invoice`.`PaymentStatus` in ('Unpaid','Overdue'))) AS `OutstandingInvoices` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_catalog`
--

/*!50001 DROP VIEW IF EXISTS `v_catalog`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_catalog` AS select `p`.`ProductID` AS `ProductID`,`p`.`ProductName` AS `ProductName`,`c`.`CategoryName` AS `CategoryName`,`s`.`SupplierID` AS `SupplierID`,`s`.`SupplierName` AS `SupplierName`,`p`.`Price` AS `Price`,`p`.`Stock` AS `Stock` from ((`product` `p` join `category` `c` on((`c`.`CategoryID` = `p`.`CategoryID`))) join `supplier` `s` on((`s`.`SupplierID` = `p`.`SupplierID`))) where ((`p`.`IsActive` = true) and (`s`.`IsActive` = true) and (`fn_current_tenant_id`() is not null)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_categories`
--

/*!50001 DROP VIEW IF EXISTS `v_categories`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_categories` AS select `category`.`CategoryID` AS `CategoryID`,`category`.`CategoryName` AS `CategoryName`,`category`.`Description` AS `Description` from `category` where (`fn_current_user_id`() is not null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_deliveries`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_deliveries`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_deliveries` AS select `d`.`DeliveryID` AS `DeliveryID`,`d`.`OrderID` AS `OrderID`,`d`.`ScheduledDate` AS `ScheduledDate`,`d`.`Status` AS `Status` from (`delivery` `d` join `orders` `o` on((`o`.`OrderID` = `d`.`OrderID`))) where (`o`.`SupplierID` = `fn_current_supplier_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_invoices`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_invoices`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_invoices` AS select `i`.`InvoiceID` AS `InvoiceID`,`i`.`OrderID` AS `OrderID`,`i`.`InvoiceDate` AS `InvoiceDate`,`i`.`Amount` AS `Amount`,`i`.`PaymentStatus` AS `PaymentStatus` from (`invoice` `i` join `orders` `o` on((`o`.`OrderID` = `i`.`OrderID`))) where (`o`.`SupplierID` = `fn_current_supplier_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_low_stock`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_low_stock`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_low_stock` AS select `product`.`ProductID` AS `ProductID`,`product`.`ProductName` AS `ProductName`,`product`.`Stock` AS `Stock` from `product` where ((`product`.`SupplierID` = `fn_current_supplier_id`()) and (`product`.`IsActive` = true) and (`product`.`Stock` <= 20)) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_order_details`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_order_details`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_order_details` AS select `od`.`OrderDetailID` AS `OrderDetailID`,`od`.`OrderID` AS `OrderID`,`od`.`ProductID` AS `ProductID`,`p`.`ProductName` AS `ProductName`,`od`.`Quantity` AS `Quantity`,`od`.`Price` AS `Price`,(`od`.`Quantity` * `od`.`Price`) AS `LineTotal` from ((`orderdetail` `od` join `orders` `o` on((`o`.`OrderID` = `od`.`OrderID`))) join `product` `p` on((`p`.`ProductID` = `od`.`ProductID`))) where (`o`.`SupplierID` = `fn_current_supplier_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_orders`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_orders`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_orders` AS select `o`.`OrderID` AS `OrderID`,`o`.`OrderDate` AS `OrderDate`,`o`.`Status` AS `Status`,`o`.`TotalAmount` AS `TotalAmount`,`t`.`BusinessName` AS `BusinessName`,`t`.`StallNumber` AS `StallNumber`,`t`.`ContactNo` AS `ContactNo`,`t`.`Address` AS `Address` from (`orders` `o` join `tenant` `t` on((`t`.`TenantID` = `o`.`TenantID`))) where (`o`.`SupplierID` = `fn_current_supplier_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_payment_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_payment_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_payment_summary` AS select `i`.`PaymentStatus` AS `PaymentStatus`,count(0) AS `InvoiceCount`,sum(`i`.`Amount`) AS `TotalAmount` from (`invoice` `i` join `orders` `o` on((`o`.`OrderID` = `i`.`OrderID`))) where (`o`.`SupplierID` = `fn_current_supplier_id`()) group by `i`.`PaymentStatus` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_products`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_products`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_products` AS select `product`.`ProductID` AS `ProductID`,`product`.`SupplierID` AS `SupplierID`,`product`.`CategoryID` AS `CategoryID`,`product`.`ProductName` AS `ProductName`,`product`.`Price` AS `Price`,`product`.`Stock` AS `Stock`,`product`.`IsActive` AS `IsActive` from `product` where (`product`.`SupplierID` = `fn_current_supplier_id`()) */
/*!50002 WITH CASCADED CHECK OPTION */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_sales_by_product`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_sales_by_product`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_sales_by_product` AS select `p`.`ProductID` AS `ProductID`,`p`.`ProductName` AS `ProductName`,coalesce(sum((case when (`o`.`OrderID` is not null) then `od`.`Quantity` end)),0) AS `UnitsSold`,coalesce(sum((case when (`o`.`OrderID` is not null) then (`od`.`Quantity` * `od`.`Price`) end)),0) AS `Revenue` from ((`product` `p` left join `orderdetail` `od` on((`od`.`ProductID` = `p`.`ProductID`))) left join `orders` `o` on(((`o`.`OrderID` = `od`.`OrderID`) and (`o`.`Status` <> 'Cancelled')))) where (`p`.`SupplierID` = `fn_current_supplier_id`()) group by `p`.`ProductID`,`p`.`ProductName` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_supplier_top_customers`
--

/*!50001 DROP VIEW IF EXISTS `v_supplier_top_customers`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_supplier_top_customers` AS select `t`.`TenantID` AS `TenantID`,`t`.`BusinessName` AS `BusinessName`,count(0) AS `OrderCount`,sum(`o`.`TotalAmount`) AS `TotalBought` from (`orders` `o` join `tenant` `t` on((`t`.`TenantID` = `o`.`TenantID`))) where ((`o`.`SupplierID` = `fn_current_supplier_id`()) and (`o`.`Status` <> 'Cancelled')) group by `t`.`TenantID`,`t`.`BusinessName` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_deliveries`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_deliveries`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_deliveries` AS select `d`.`DeliveryID` AS `DeliveryID`,`d`.`OrderID` AS `OrderID`,`d`.`ScheduledDate` AS `ScheduledDate`,`d`.`Status` AS `Status` from (`delivery` `d` join `orders` `o` on((`o`.`OrderID` = `d`.`OrderID`))) where (`o`.`TenantID` = `fn_current_tenant_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_invoices`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_invoices`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_invoices` AS select `i`.`InvoiceID` AS `InvoiceID`,`i`.`OrderID` AS `OrderID`,`i`.`InvoiceDate` AS `InvoiceDate`,`i`.`Amount` AS `Amount`,`i`.`PaymentStatus` AS `PaymentStatus` from (`invoice` `i` join `orders` `o` on((`o`.`OrderID` = `i`.`OrderID`))) where (`o`.`TenantID` = `fn_current_tenant_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_monthly_spending`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_monthly_spending`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_monthly_spending` AS select date_format(`orders`.`OrderDate`,'%Y-%m') AS `OrderMonth`,count(0) AS `OrderCount`,sum(`orders`.`TotalAmount`) AS `TotalSpent` from `orders` where ((`orders`.`TenantID` = `fn_current_tenant_id`()) and (`orders`.`Status` <> 'Cancelled')) group by date_format(`orders`.`OrderDate`,'%Y-%m') */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_order_details`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_order_details`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_order_details` AS select `od`.`OrderDetailID` AS `OrderDetailID`,`od`.`OrderID` AS `OrderID`,`od`.`ProductID` AS `ProductID`,`p`.`ProductName` AS `ProductName`,`od`.`Quantity` AS `Quantity`,`od`.`Price` AS `Price`,(`od`.`Quantity` * `od`.`Price`) AS `LineTotal` from ((`orderdetail` `od` join `orders` `o` on((`o`.`OrderID` = `od`.`OrderID`))) join `product` `p` on((`p`.`ProductID` = `od`.`ProductID`))) where (`o`.`TenantID` = `fn_current_tenant_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_orders`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_orders`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_orders` AS select `orders`.`OrderID` AS `OrderID`,`orders`.`TenantID` AS `TenantID`,`orders`.`SupplierID` AS `SupplierID`,`orders`.`UserID` AS `UserID`,`orders`.`OrderDate` AS `OrderDate`,`orders`.`Status` AS `Status`,`orders`.`TotalAmount` AS `TotalAmount` from `orders` where (`orders`.`TenantID` = `fn_current_tenant_id`()) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_payment_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_payment_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_payment_summary` AS select `i`.`PaymentStatus` AS `PaymentStatus`,count(0) AS `InvoiceCount`,sum(`i`.`Amount`) AS `TotalAmount` from (`invoice` `i` join `orders` `o` on((`o`.`OrderID` = `i`.`OrderID`))) where (`o`.`TenantID` = `fn_current_tenant_id`()) group by `i`.`PaymentStatus` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_spending_by_supplier`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_spending_by_supplier`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_spending_by_supplier` AS select `s`.`SupplierID` AS `SupplierID`,`s`.`SupplierName` AS `SupplierName`,count(0) AS `OrderCount`,sum(`o`.`TotalAmount`) AS `TotalSpent`,round(avg(`o`.`TotalAmount`),2) AS `AvgOrderValue` from (`orders` `o` join `supplier` `s` on((`s`.`SupplierID` = `o`.`SupplierID`))) where ((`o`.`TenantID` = `fn_current_tenant_id`()) and (`o`.`Status` <> 'Cancelled')) group by `s`.`SupplierID`,`s`.`SupplierName` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `v_tenant_supplier_performance`
--

/*!50001 DROP VIEW IF EXISTS `v_tenant_supplier_performance`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_tenant_supplier_performance` AS select `s`.`SupplierID` AS `SupplierID`,`s`.`SupplierName` AS `SupplierName`,count(0) AS `TotalOrders`,sum((`o`.`Status` = 'Delivered')) AS `DeliveredOrders`,sum((`o`.`Status` = 'Cancelled')) AS `CancelledOrders`,round(((100 * sum((`o`.`Status` = 'Delivered'))) / count(0)),1) AS `DeliveredPercent` from (`orders` `o` join `supplier` `s` on((`s`.`SupplierID` = `o`.`SupplierID`))) where (`o`.`TenantID` = `fn_current_tenant_id`()) group by `s`.`SupplierID`,`s`.`SupplierName` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-14 23:15:52
