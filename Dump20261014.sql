

USE `food_supply_network`;

-- -----------------------------------------------------------------------------
-- 1. INDEX OPTIMIZATION PATTERNS
-- Creates composite indexes safely without throwing duplicate key errors
-- -----------------------------------------------------------------------------

SET @exist_idx_orders_tenant_status := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'food_supply_network' 
      AND TABLE_NAME = 'orders' 
      AND INDEX_NAME = 'idx_orders_tenant_status_date'
);
SET @sql_orders_idx := IF(@exist_idx_orders_tenant_status = 0, 
    'ALTER TABLE `orders` ADD KEY `idx_orders_tenant_status_date` (`TenantID`, `Status`, `OrderDate` DESC)', 
    'SELECT "Index idx_orders_tenant_status_date already exists"');
PREPARE stmt FROM @sql_orders_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_idx_orders_supplier_status := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'food_supply_network' 
      AND TABLE_NAME = 'orders' 
      AND INDEX_NAME = 'idx_orders_supplier_status'
);
SET @sql_orders_supplier_idx := IF(@exist_idx_orders_supplier_status = 0, 
    'ALTER TABLE `orders` ADD KEY `idx_orders_supplier_status` (`SupplierID`, `Status`, `TotalAmount`)', 
    'SELECT "Index idx_orders_supplier_status already exists"');
PREPARE stmt FROM @sql_orders_supplier_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exist_idx_product_cat := (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'food_supply_network' 
      AND TABLE_NAME = 'product' 
      AND INDEX_NAME = 'idx_product_supplier_category_price'
);
SET @sql_product_idx := IF(@exist_idx_product_cat = 0, 
    'ALTER TABLE `product` ADD KEY `idx_product_supplier_category_price` (`SupplierID`, `CategoryID`, `IsActive`, `Price`)', 
    'SELECT "Index idx_product_supplier_category_price already exists"');
PREPARE stmt FROM @sql_product_idx;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- 2. AUTOMATED FUNCTIONS
-- Helper logic for context retrieval and RLS/RBAC resolution
-- -----------------------------------------------------------------------------

DELIMITER ;;

DROP FUNCTION IF EXISTS `fn_current_supplier_id` ;;
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

DROP FUNCTION IF EXISTS `fn_current_tenant_id` ;;
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

DROP FUNCTION IF EXISTS `fn_current_user_id` ;;
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

-- -----------------------------------------------------------------------------
-- 3. AUTOMATED AUDIT & INVENTORY TRIGGERS
-- Server-side event triggers for tracking changes and inventory maintenance
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS `trg_orderdetail_after_insert` ;;
CREATE DEFINER=`root`@`localhost` TRIGGER `trg_orderdetail_after_insert` AFTER INSERT ON `orderdetail` FOR EACH ROW 
BEGIN
    UPDATE `product`
    SET `Stock` = `Stock` - NEW.`Quantity`
    WHERE `ProductID` = NEW.`ProductID`;
END ;;

DROP TRIGGER IF EXISTS `trg_orders_after_update` ;;
CREATE DEFINER=`root`@`localhost` TRIGGER `trg_orders_after_update` AFTER UPDATE ON `orders` FOR EACH ROW 
BEGIN
    IF OLD.`Status` <> NEW.`Status` THEN
        INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
        VALUES (fn_current_user_id(), CONCAT('STATUS_', NEW.`Status`), 'Orders', NOW());
    END IF;
END ;;

DROP TRIGGER IF EXISTS `trg_product_after_update` ;;
CREATE DEFINER=`root`@`localhost` TRIGGER `trg_product_after_update` AFTER UPDATE ON `product` FOR EACH ROW 
BEGIN
    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (fn_current_user_id(), 'UPDATE', 'Product', NOW());
END ;;

-- -----------------------------------------------------------------------------
-- 4. STORED PROCEDURES & CUSTOM TRANSACTION BLOCKS
-- Transactional business logic with pessimistic locking (FOR UPDATE) & error handling
-- -----------------------------------------------------------------------------

DROP PROCEDURE IF EXISTS `sp_add_product` ;;
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

    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, 'INSERT', 'Product', NOW());

    COMMIT;

    SELECT v_new_product_id AS NewProductID, p_product_name AS ProductName, p_price AS Price, p_stock AS Stock;
END ;;

DROP PROCEDURE IF EXISTS `sp_cancel_order` ;;
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

    UPDATE `product` p
    JOIN `orderdetail` od ON od.`ProductID` = p.`ProductID`
       SET p.`Stock` = p.`Stock` + od.`Quantity`
     WHERE od.`OrderID` = p_order_id;

    UPDATE `orders`
       SET `Status` = 'Cancelled'
     WHERE `OrderID` = p_order_id;

    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, 'STATUS_Cancelled', 'Orders', NOW());

    COMMIT;

    SELECT p_order_id AS OrderID, 'Cancelled' AS Status, 'Stock successfully reverted' AS Result;
END ;;

DROP PROCEDURE IF EXISTS `sp_complete_order` ;;
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

DROP PROCEDURE IF EXISTS `sp_place_bulk_order` ;;
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

DROP PROCEDURE IF EXISTS `sp_place_order` ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_place_order`(
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

    UPDATE `product` SET `Stock` = `Stock` - p_quantity WHERE `ProductID` = p_product_id;

    INSERT INTO `auditlog` (`UserID`, `Action`, `TableName`, `LoggedAt`)
    VALUES (v_user_id, 'INSERT', 'Orders', NOW());

    COMMIT;

    SELECT v_order_id AS NewOrderID, (v_price * p_quantity) AS TotalAmount;
END ;;

DROP PROCEDURE IF EXISTS `sp_process_invoice_payment` ;;
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

DROP PROCEDURE IF EXISTS `sp_toggle_product_status` ;;
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

DROP PROCEDURE IF EXISTS `sp_update_delivery_schedule` ;;
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

DROP PROCEDURE IF EXISTS `sp_update_product_catalog` ;;
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

    COMMIT;

    SELECT p_product_id AS ProductID, p_price AS UpdatedPrice, p_stock AS UpdatedStock;
END ;;

DELIMITER ;
