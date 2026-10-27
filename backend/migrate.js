import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'node:fs';
dotenv.config();

async function runMigration() {
  let sslConfig = false;
  if (process.env.DB_CA_CERT) {
    const certText = process.env.DB_CA_CERT.includes('\\n')
      ? process.env.DB_CA_CERT.replace(/\\n/g, '\n')
      : process.env.DB_CA_CERT;
    sslConfig = { ca: certText, rejectUnauthorized: true };
  } else if (process.env.DB_CA_PATH && fs.existsSync(process.env.DB_CA_PATH)) {
    sslConfig = { ca: fs.readFileSync(process.env.DB_CA_PATH), rejectUnauthorized: true };
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'food_supply_network',
    ssl: sslConfig,
  });

  console.log('Connected to database...');

  // 1. Description in Supplier
  const [suppCols] = await conn.query('DESCRIBE Supplier');
  if (!suppCols.some(c => c.Field === 'Description')) {
    await conn.query('ALTER TABLE Supplier ADD COLUMN Description TEXT NULL AFTER Address');
    console.log('Added Description to Supplier');
  } else {
    console.log('Supplier already has Description');
  }

  // 2. Description in Tenant
  const [tenCols] = await conn.query('DESCRIBE Tenant');
  if (!tenCols.some(c => c.Field === 'Description')) {
    await conn.query('ALTER TABLE Tenant ADD COLUMN Description TEXT NULL AFTER Address');
    console.log('Added Description to Tenant');
  } else {
    console.log('Tenant already has Description');
  }

  // 3. EmailVerification table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS EmailVerification (
      VerificationID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      Email VARCHAR(150) NOT NULL,
      Code VARCHAR(6) NOT NULL,
      ExpiresAt DATETIME NOT NULL,
      UsedAt DATETIME NULL,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_code (Email, Code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('EmailVerification table ready');

  // 4. PasswordReset table
  await conn.query(`
    CREATE TABLE IF NOT EXISTS PasswordReset (
      ResetID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      UserID INT UNSIGNED NOT NULL,
      Email VARCHAR(150) NOT NULL,
      Token VARCHAR(100) NOT NULL,
      ExpiresAt DATETIME NOT NULL,
      UsedAt DATETIME NULL,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_token (Token),
      INDEX idx_email (Email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('PasswordReset table ready');

  // 5. Expand categories
  const categoriesToAdd = [
    { name: 'Meat', desc: 'Pork, chicken, beef and other quality meats' },
    { name: 'Seafood', desc: 'Fresh fish, shrimp, crabs, and marine produce' },
    { name: 'Vegetables', desc: 'Farm-fresh leafy greens and root vegetables' },
    { name: 'Fruits', desc: 'Fresh seasonal local and imported fruits' },
    { name: 'Dairy', desc: 'Fresh milk, cheese, butter, and yogurt' },
    { name: 'Dry Goods', desc: 'Rice, flour, grains, spices, and cooking pantry essentials' },
    { name: 'Beverages', desc: 'Juices, bottled water, coffee, teas, and specialty drinks' },
    { name: 'Frozen Foods', desc: 'Pre-packaged frozen foods, processed meats, and appetizers' },
    { name: 'Packaging & Supplies', desc: 'Food containers, meal boxes, cutlery, wraps, and bags' },
  ];

  for (const cat of categoriesToAdd) {
    const [existing] = await conn.query('SELECT CategoryID FROM Category WHERE CategoryName = ?', [cat.name]);
    if (!existing.length) {
      await conn.query('INSERT INTO Category (CategoryName, Description) VALUES (?, ?)', [cat.name, cat.desc]);
      console.log('Inserted category:', cat.name);
    } else {
      console.log('Category already exists:', cat.name);
    }
  }

  // 6. Provide sample descriptions for existing suppliers if null
  await conn.query(`
    UPDATE Supplier SET Description = 'Specializing in premium local Bohol pork, poultry cuts, and fresh beef daily.'
    WHERE SupplierID = 1 AND (Description IS NULL OR Description = '')
  `);
  await conn.query(`
    UPDATE Supplier SET Description = 'Organic, sustainably grown farm-fresh vegetables and seasonal Bohol herbs.'
    WHERE SupplierID = 2 AND (Description IS NULL OR Description = '')
  `);
  await conn.query(`
    UPDATE Supplier SET Description = 'Daily fresh carabao milk, artisanal cheese, plus pantry grains and cooking staples.'
    WHERE SupplierID = 3 AND (Description IS NULL OR Description = '')
  `);

  // 7. Business Legitimacy Verification columns in Supplier and Tenant
  const [sCols] = await conn.query('DESCRIBE Supplier');
  if (!sCols.some(c => c.Field === 'VerificationStatus')) {
    await conn.query(`ALTER TABLE Supplier
      ADD COLUMN VerificationStatus ENUM('Pending Verification', 'Verified', 'Rejected', 'Requires Additional Information') NOT NULL DEFAULT 'Pending Verification' AFTER IsActive,
      ADD COLUMN BusinessType VARCHAR(100) NULL AFTER VerificationStatus,
      ADD COLUMN RegistrationNumber VARCHAR(100) NULL AFTER BusinessType,
      ADD COLUMN TaxIdNumber VARCHAR(50) NULL AFTER RegistrationNumber
    `);
    console.log('Added VerificationStatus and business registration columns to Supplier');
  } else {
    console.log('Supplier already has VerificationStatus');
  }

  const [tCols] = await conn.query('DESCRIBE Tenant');
  if (!tCols.some(c => c.Field === 'VerificationStatus')) {
    await conn.query(`ALTER TABLE Tenant
      ADD COLUMN VerificationStatus ENUM('Pending Verification', 'Verified', 'Rejected', 'Requires Additional Information') NOT NULL DEFAULT 'Pending Verification' AFTER IsActive,
      ADD COLUMN BusinessType VARCHAR(100) NULL AFTER VerificationStatus,
      ADD COLUMN RegistrationNumber VARCHAR(100) NULL AFTER BusinessType,
      ADD COLUMN TaxIdNumber VARCHAR(50) NULL AFTER RegistrationNumber
    `);
    console.log('Added VerificationStatus and business registration columns to Tenant');
  } else {
    console.log('Tenant already has VerificationStatus');
  }

  // Set existing seed suppliers and tenants as Verified so existing accounts and data work out-of-the-box
  await conn.query(`
    UPDATE Supplier SET
      VerificationStatus = 'Verified',
      BusinessType = COALESCE(BusinessType, 'Sole Proprietorship'),
      RegistrationNumber = COALESCE(RegistrationNumber, CONCAT('DTI-BOH-', LPAD(SupplierID, 5, '0'))),
      TaxIdNumber = COALESCE(TaxIdNumber, CONCAT('284-918-00', SupplierID))
    WHERE SupplierID IN (1, 2, 3, 4)
  `);

  await conn.query(`
    UPDATE Tenant SET
      VerificationStatus = 'Verified',
      BusinessType = COALESCE(BusinessType, 'Sole Proprietorship'),
      RegistrationNumber = COALESCE(RegistrationNumber, CONCAT('BP-TAG-', LPAD(TenantID, 5, '0'))),
      TaxIdNumber = COALESCE(TaxIdNumber, CONCAT('192-847-00', TenantID))
    WHERE TenantID IN (1, 2, 3)
  `);

  // 8. BusinessVerification table for audit trail, document review, and admin workflow
  await conn.query(`
    CREATE TABLE IF NOT EXISTS BusinessVerification (
      VerificationID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      Role ENUM('BusinessOwner', 'Supplier') NOT NULL,
      TenantID INT UNSIGNED NULL,
      SupplierID INT UNSIGNED NULL,
      UserID INT UNSIGNED NOT NULL,
      BusinessName VARCHAR(150) NOT NULL,
      BusinessType VARCHAR(100) NOT NULL DEFAULT 'Sole Proprietorship',
      RegistrationNumber VARCHAR(100) NOT NULL,
      TaxIdNumber VARCHAR(50) NULL,
      ContactPhone VARCHAR(50) NOT NULL,
      BusinessAddress VARCHAR(255) NOT NULL,
      DocumentType VARCHAR(100) NOT NULL DEFAULT "Mayor's / Business Permit",
      DocumentFileName VARCHAR(255) NULL,
      DocumentFileUrl LONGTEXT NULL,
      DocumentNotes TEXT NULL,
      Status ENUM('Pending Verification', 'Verified', 'Rejected', 'Requires Additional Information') NOT NULL DEFAULT 'Pending Verification',
      AdminNotes TEXT NULL,
      ReviewedBy INT UNSIGNED NULL,
      ReviewedAt DATETIME NULL,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenant (TenantID),
      INDEX idx_supplier (SupplierID),
      INDEX idx_user (UserID),
      INDEX idx_status (Status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log('BusinessVerification table ready');

  // Seed sample verified submissions for existing businesses if none exist
  const [existingVerifs] = await conn.query('SELECT COUNT(*) AS count FROM BusinessVerification');
  if (existingVerifs[0].count === 0) {
    // Supplier 1
    await conn.query(`
      INSERT INTO BusinessVerification
        (Role, SupplierID, UserID, BusinessName, BusinessType, RegistrationNumber, TaxIdNumber, ContactPhone, BusinessAddress, DocumentType, DocumentFileName, DocumentNotes, Status, AdminNotes, ReviewedBy, ReviewedAt)
      VALUES
        ('Supplier', 1, 5, 'Tagbilaran Fresh Meats', 'Sole Proprietorship', 'DTI-BOH-00001', '284-918-001', '0928-222-0001', 'Brgy. Booy, Tagbilaran City, Bohol', "Mayor's / Business Permit", 'tagmeats_permit_2026.pdf', 'Complete city meat inspection and business permit attached.', 'Verified', 'Verified with Tagbilaran City Licensing Division.', 1, NOW()),
        ('Supplier', 2, 6, 'Bohol Green Farms', 'Sole Proprietorship', 'DTI-BOH-00002', '284-918-002', '0928-222-0002', 'Brgy. Taloto, Tagbilaran City, Bohol', 'DTI Certificate of Registration', 'bohol_green_dti.pdf', 'Organic agriculture registration & city permit.', 'Verified', 'Legitimate agricultural supplier verified.', 1, NOW()),
        ('BusinessOwner', 1, 2, 'Kusina ni Maria', 'Sole Proprietorship', 'BP-TAG-00001', '192-847-001', '0917-111-0001', 'Agora Public Market, Tagbilaran City, Bohol', "Mayor's / Business Permit", 'kusina_maria_stall_permit.pdf', 'Agora market stall lease & sanitary permit.', 'Verified', 'Agora market tenant permit verified.', 1, NOW())
    `);
    console.log('Seeded initial verified business records');
  }

  // 9. Receipt table for order receipts, itemization, and printing
  await conn.query(`
    CREATE TABLE IF NOT EXISTS Receipt (
      ReceiptID INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      ReceiptNumber VARCHAR(60) NOT NULL UNIQUE,
      OrderID INT UNSIGNED NOT NULL UNIQUE,
      TenantID INT UNSIGNED NOT NULL,
      SupplierID INT UNSIGNED NOT NULL,
      ReceiptType ENUM('Order Receipt', 'Payment Receipt', 'Official Receipt') NOT NULL DEFAULT 'Order Receipt',
      ReceiptDate DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      Subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      DeliveryFee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      Discount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      TotalAmount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      PaymentMethod VARCHAR(50) NULL,
      PaymentStatus ENUM('Unpaid', 'Paid', 'Overdue', 'Failed', 'Refunded') NOT NULL DEFAULT 'Unpaid',
      PaymentReference VARCHAR(100) NULL,
      PaidAt DATETIME NULL,
      Notes TEXT NULL,
      CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_order (OrderID),
      INDEX idx_tenant (TenantID),
      INDEX idx_supplier (SupplierID)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  // Ensure PaymentStatus enum includes Overdue if table existed
  await conn.query(`
    ALTER TABLE Receipt MODIFY COLUMN PaymentStatus ENUM('Unpaid', 'Paid', 'Overdue', 'Failed', 'Refunded') NOT NULL DEFAULT 'Unpaid'
  `);
  console.log('Receipt table ready');

  // 10. Backfill receipts for any existing orders without a receipt
  const [ordersWithoutReceipt] = await conn.query(`
    SELECT o.OrderID, o.TenantID, o.SupplierID, o.TotalAmount, o.OrderDate,
           i.PaymentStatus
    FROM Orders o
    LEFT JOIN Invoice i ON i.OrderID = o.OrderID
    LEFT JOIN Receipt r ON r.OrderID = o.OrderID
    WHERE r.ReceiptID IS NULL
  `);

  for (const o of ordersWithoutReceipt) {
    const receiptNum = 'RCP-' + new Date(o.OrderDate).toISOString().slice(0, 10).replace(/-/g, '') + '-' + String(o.OrderID).padStart(4, '0');
    const isPaid = o.PaymentStatus === 'Paid';
    await conn.query(`
      INSERT INTO Receipt
        (ReceiptNumber, OrderID, TenantID, SupplierID, ReceiptType, ReceiptDate, Subtotal, DeliveryFee, Discount, TotalAmount, PaymentMethod, PaymentStatus, PaymentReference, Notes)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, 0.00, 0.00, ?, ?, ?, ?, 'Generated from historical order record.')
    `, [
      receiptNum,
      o.OrderID,
      o.TenantID,
      o.SupplierID,
      isPaid ? 'Payment Receipt' : 'Order Receipt',
      o.OrderDate,
      o.TotalAmount,
      o.TotalAmount,
      isPaid ? 'DIRECT' : 'Pending',
      o.PaymentStatus || 'Unpaid',
      isPaid ? ('TXN-SYS-' + o.OrderID) : null
    ]);
  }
  if (ordersWithoutReceipt.length > 0) {
    console.log(`Backfilled ${ordersWithoutReceipt.length} order receipts.`);
  }

  console.log('Migration complete successfully!');
  await conn.end();
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
