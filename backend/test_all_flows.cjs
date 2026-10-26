/**
 * Comprehensive Automated End-to-End Test Suite
 * Tests Business Legitimacy Verification, Sign-up Validation, and Printable Receipts.
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const mysql = require(path.resolve(__dirname, 'node_modules/mysql2/promise'));
require(path.resolve(__dirname, 'node_modules/dotenv')).config({ path: path.resolve(__dirname, '.env') });

const TEST_PORT = 3005;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

function request(endpoint, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const headers = { ...(options.headers || {}) };
    let payload = null;

    if (body !== null) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(url, {
      method: options.method || 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = data ? JSON.parse(data) : {};
        } catch {
          parsed = { raw: data };
        }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

let serverProcess = null;

async function runTests() {
  console.log('========================================================');
  console.log(' Starting End-to-End Integration Test Suite');
  console.log('========================================================\n');

  // DB pool for test assertions & reading verification codes
  const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'food_supply_network'
  });

  // Start test server on TEST_PORT
  console.log(`Starting backend server on port ${TEST_PORT}...`);
  serverProcess = spawn('node', ['server.js'], {
    env: { ...process.env, PORT: TEST_PORT },
    cwd: __dirname,
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', (d) => {
    // console.log('[SERVER]', d.toString().trim());
  });
  serverProcess.stderr.on('data', (d) => {
    console.error('[SERVER ERR]', d.toString().trim());
  });

  // Wait for server to be responsive
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await request('/health');
      if (res.status === 200) { ready = true; break; }
    } catch {}
  }

  if (!ready) {
    throw new Error('Test server failed to start on port ' + TEST_PORT);
  }
  console.log('✔ Backend test server is ready.\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ✖ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // ---------------------------------------------------------
    // TEST 1: Admin & Demo User Login
    // ---------------------------------------------------------
    console.log('--- 1. Testing Authentication & Existing Users ---');
    const adminLogin = await request('/login', { method: 'POST' }, {
      email: 'admin@foodnet.test',
      password: 'Admin123!'
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin login succeeded');
    const adminToken = adminLogin.data.token;

    const mariaLogin = await request('/login', { method: 'POST' }, {
      email: 'maria@kusina.test',
      password: 'Maria123!'
    });
    assert(mariaLogin.status === 200 && mariaLogin.data.token, 'Verified BusinessOwner (Maria) login succeeded');
    const mariaToken = mariaLogin.data.token;

    const ramonLogin = await request('/login', { method: 'POST' }, {
      email: 'ramon@tagmeats.test',
      password: 'Ramon123!'
    });
    assert(ramonLogin.status === 200 && ramonLogin.data.token, 'Verified Supplier (Ramon) login succeeded');
    const ramonToken = ramonLogin.data.token;

    // ---------------------------------------------------------
    // TEST 2: Sign-Up Form Validation
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Sign-Up Form Validation ---');
    
    // 2a. Weak password rejection
    const weakPass = await request('/register', { method: 'POST' }, {
      name: 'Tester One',
      email: 'tester_weak@test.com',
      password: 'simple',
      confirmPassword: 'simple',
      role: 'BusinessOwner',
      businessName: 'Tester Shop',
      contactNo: '09171234567'
    });
    assert(weakPass.status === 400 && weakPass.data.fieldErrors?.password, 'Rejects weak password with specific field error');

    // 2b. Password mismatch rejection
    const passMismatch = await request('/register', { method: 'POST' }, {
      name: 'Tester One',
      email: 'tester_mismatch@test.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword999!',
      role: 'BusinessOwner',
      businessName: 'Tester Shop',
      contactNo: '09171234567'
    });
    assert(passMismatch.status === 400 && passMismatch.data.fieldErrors?.confirmPassword, 'Rejects password confirmation mismatch');

    // 2c. Invalid phone number rejection
    const badPhone = await request('/register', { method: 'POST' }, {
      name: 'Tester One',
      email: 'tester_badphone@test.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'BusinessOwner',
      businessName: 'Tester Shop',
      contactNo: 'abc-not-phone'
    });
    assert(badPhone.status === 400 && badPhone.data.fieldErrors?.contactNo, 'Rejects invalid phone number format');

    // 2d. Missing required business name for BusinessOwner
    const missingBiz = await request('/register', { method: 'POST' }, {
      name: 'Tester One',
      email: 'tester_nobiz@test.com',
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'BusinessOwner',
      businessName: '',
      contactNo: '09171234567'
    });
    assert(missingBiz.status === 400 && missingBiz.data.fieldErrors?.businessName, 'Requires businessName for BusinessOwner');

    // 2e. Duplicate email registration rejection
    const dupEmail = await request('/register', { method: 'POST' }, {
      name: 'Duplicate Maria',
      email: 'maria@kusina.test', // existing active email
      password: 'StrongPassword123!',
      confirmPassword: 'StrongPassword123!',
      role: 'BusinessOwner',
      businessName: 'Another Maria Shop',
      contactNo: '09171234567'
    });
    assert(dupEmail.status === 400 && dupEmail.data.fieldErrors?.email, 'Prevents duplicate email registration');

    // 2f. Valid registration of new Business Owner + 2-step email verification
    const uniqueSuffix = Date.now().toString().slice(-6);
    const newOwnerEmail = `newowner_${uniqueSuffix}@boholfoods.test`;
    const regOwnerRes = await request('/register', { method: 'POST' }, {
      name: 'Juan Dela Cruz',
      email: newOwnerEmail,
      password: 'SecurePassword2026!',
      confirmPassword: 'SecurePassword2026!',
      role: 'BusinessOwner',
      businessName: `Bohol Gourmet Resto ${uniqueSuffix}`,
      businessType: 'Restaurant',
      registrationNumber: `DTI-2026-${uniqueSuffix}`,
      contactNo: '09175550199',
      address: 'CPG Avenue, Tagbilaran City'
    });
    assert((regOwnerRes.status === 201 || regOwnerRes.status === 200) && (regOwnerRes.data.status === 'verification_required' || regOwnerRes.data.requiresVerification), 'Submitted Business Owner registration requires verification');

    // Retrieve verification code from DB
    const [[ownerCodeRow]] = await db.execute(
      'SELECT Code FROM EmailVerification WHERE Email = ? ORDER BY VerificationID DESC LIMIT 1',
      [newOwnerEmail]
    );
    assert(ownerCodeRow && ownerCodeRow.Code, 'Email verification code generated in database');

    // Submit code to activate account
    const verifyOwnerRes = await request('/verify-code', { method: 'POST' }, {
      email: newOwnerEmail,
      code: ownerCodeRow.Code
    });
    assert(verifyOwnerRes.status === 200 && verifyOwnerRes.data.success, 'Successfully verified email code for new Business Owner');

    // Log in new Business Owner
    const newOwnerLogin = await request('/login', { method: 'POST' }, {
      email: newOwnerEmail,
      password: 'SecurePassword2026!'
    });
    assert(newOwnerLogin.status === 200 && newOwnerLogin.data.token, 'Logged in newly verified Business Owner');
    const newOwnerToken = newOwnerLogin.data.token;

    // Verify initial status is Pending Verification
    const newOwnerMe = await request('/me', { headers: { Authorization: `Bearer ${newOwnerToken}` } });
    assert(newOwnerMe.data?.VerificationStatus === 'Pending Verification', 'New Business Owner initial status is "Pending Verification"');

    // 2g. Valid registration of new Food Supplier + 2-step email verification
    const newSuppEmail = `newsupp_${uniqueSuffix}@boholfoods.test`;
    const regSuppRes = await request('/register', { method: 'POST' }, {
      name: 'Pedro Calungsod',
      email: newSuppEmail,
      password: 'SecurePassword2026!',
      confirmPassword: 'SecurePassword2026!',
      role: 'Supplier',
      businessName: `Bohol Organic Farm ${uniqueSuffix}`,
      businessType: 'Organic Produce',
      registrationNumber: `SEC-2026-${uniqueSuffix}`,
      contactNo: '09187770188',
      address: 'Corella, Bohol'
    });
    assert((regSuppRes.status === 201 || regSuppRes.status === 200) && (regSuppRes.data.status === 'verification_required' || regSuppRes.data.requiresVerification), 'Submitted Food Supplier registration requires verification');

    const [[suppCodeRow]] = await db.execute(
      'SELECT Code FROM EmailVerification WHERE Email = ? ORDER BY VerificationID DESC LIMIT 1',
      [newSuppEmail]
    );
    await request('/verify-code', { method: 'POST' }, { email: newSuppEmail, code: suppCodeRow.Code });

    const newSuppLogin = await request('/login', { method: 'POST' }, {
      email: newSuppEmail,
      password: 'SecurePassword2026!'
    });
    assert(newSuppLogin.status === 200 && newSuppLogin.data.token, 'Logged in newly verified Food Supplier');
    const newSuppToken = newSuppLogin.data.token;

    // ---------------------------------------------------------
    // TEST 3: Feature Restriction for Unverified Merchants
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing Sensitive Feature Restrictions for Unverified Merchants ---');

    // 3a. Unverified Supplier CANNOT add products
    const addProductUnverified = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newSuppToken}` }
    }, {
      name: 'Unverified Strawberries',
      categoryId: 1,
      price: 250,
      stock: 50,
      description: 'Fresh berries'
    });
    assert(addProductUnverified.status === 403, 'Unverified Supplier blocked from adding products (403)');

    // 3b. Unverified Business Owner CANNOT place orders
    const orderUnverified = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newOwnerToken}` }
    }, {
      supplierId: 1,
      deliveryAddress: 'CPG Avenue, Tagbilaran City',
      items: [{ productId: 1, quantity: 2 }]
    });
    assert(orderUnverified.status === 403, 'Unverified Business Owner blocked from placing orders (403)');

    // ---------------------------------------------------------
    // TEST 4: Business Legitimacy Verification Lifecycle
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Business Legitimacy Verification Lifecycle ---');

    // 4a. Check my-status endpoint
    const myStatusBefore = await request('/verification/my-status', {
      headers: { Authorization: `Bearer ${newOwnerToken}` }
    });
    assert(myStatusBefore.status === 200 && myStatusBefore.data.VerificationStatus === 'Pending Verification', 'User can check their current verification status');

    // 4b. Submit verification documents (Base64 PDF mock)
    const mockDocData = Buffer.from('Mock Permit Content for Bohol Gourmet Resto').toString('base64');
    const submitDoc = await request('/verification/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newOwnerToken}` }
    }, {
      businessName: `Bohol Gourmet Resto ${uniqueSuffix}`,
      businessType: 'Restaurant & Catering',
      registrationNumber: `DTI-2026-${uniqueSuffix}`,
      taxIdNumber: '123-456-789-000',
      documentType: "Mayor's Business Permit",
      documentFileName: 'mayors_permit_2026.pdf',
      documentBase64: `data:application/pdf;base64,${mockDocData}`,
      notes: 'Please review our 2026 renewal permit.'
    });
    assert(submitDoc.status === 200 && submitDoc.data.verificationId, 'Submitted business verification document with base64 proof');
    const verificationId = submitDoc.data.verificationId;

    // 4c. Admin lists pending verifications
    const adminVerifList = await request('/verification/admin/list?status=Pending%20Verification', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminVerifList.status === 200 && adminVerifList.data.some(v => v.VerificationID === verificationId), 'Admin can view pending verification request in list');

    // 4d. Admin requests additional information (mandatory reason check)
    const reqInfoNoReason = await request(`/verification/admin/${verificationId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      decision: 'Requires Additional Information',
      notes: ''
    });
    assert(reqInfoNoReason.status === 400, 'Admin request for additional info requires a mandatory reason');

    const reqInfoWithReason = await request(`/verification/admin/${verificationId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      decision: 'Requires Additional Information',
      notes: 'Mayor permit scan is blurry; please provide a clearer photo or BIR 2303.'
    });
    assert(reqInfoWithReason.status === 200 && reqInfoWithReason.data.status === 'Requires Additional Information', 'Admin successfully requested additional information with reason');

    // Verify tenant status updated
    const statusAfterReq = await request('/verification/my-status', {
      headers: { Authorization: `Bearer ${newOwnerToken}` }
    });
    assert(statusAfterReq.data.VerificationStatus === 'Requires Additional Information' && statusAfterReq.data.AdminNotes.includes('blurry'), 'Merchant sees "Requires Additional Information" and admin feedback');

    // 4e. Admin Rejection (mandatory reason check)
    const rejectNoReason = await request(`/verification/admin/${verificationId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      decision: 'Rejected',
      notes: ''
    });
    assert(rejectNoReason.status === 400, 'Admin rejection requires a mandatory reason');

    // 4f. Admin Approval
    const approveVerif = await request(`/verification/admin/${verificationId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      decision: 'Verified',
      notes: 'All documents verified and legitimate.'
    });
    assert(approveVerif.status === 200 && approveVerif.data.status === 'Verified', 'Admin successfully verified the business');

    // Verify tenant status updated to Verified
    const statusAfterApprove = await request('/verification/my-status', {
      headers: { Authorization: `Bearer ${newOwnerToken}` }
    });
    assert(statusAfterApprove.data.VerificationStatus === 'Verified', 'Merchant status is now "Verified"');

    // Also verify new supplier
    const submitSuppDoc = await request('/verification/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${newSuppToken}` }
    }, {
      businessName: `Bohol Organic Farm ${uniqueSuffix}`,
      businessType: 'Organic Produce',
      registrationNumber: `SEC-2026-${uniqueSuffix}`,
      taxIdNumber: '987-654-321-000',
      documentType: 'SEC Certificate',
      documentFileName: 'sec_cert.pdf',
      documentBase64: `data:application/pdf;base64,${mockDocData}`
    });
    const suppVerifId = submitSuppDoc.data.verificationId;
    await request(`/verification/admin/${suppVerifId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, { decision: 'Verified', notes: 'Approved.' });

    // Refresh new tokens to ensure verified status is in JWT
    const refreshedOwnerLogin = await request('/login', { method: 'POST' }, {
      email: newOwnerEmail,
      password: 'SecurePassword2026!'
    });
    const refreshedOwnerToken = refreshedOwnerLogin.data.token;

    const refreshedSuppLogin = await request('/login', { method: 'POST' }, {
      email: newSuppEmail,
      password: 'SecurePassword2026!'
    });
    const refreshedSuppToken = refreshedSuppLogin.data.token;

    // ---------------------------------------------------------
    // TEST 5: Verified Merchants Can Now Perform Sensitive Actions
    // ---------------------------------------------------------
    console.log('\n--- 5. Testing Verified Merchant Access Unlocked ---');

    // 5a. Verified Supplier can now add products
    const addProductVerified = await request('/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshedSuppToken}` }
    }, {
      name: `Native Bohol Ube ${uniqueSuffix}`,
      categoryId: 1,
      price: 180,
      stock: 100,
      unit: 'kg',
      description: 'Authentic Bohol purple yam'
    });
    assert(addProductVerified.status === 201 && addProductVerified.data.ProductID, 'Verified Supplier successfully added a product');

    // 5b. Verified Business Owner can now place orders
    const orderVerified = await request('/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshedOwnerToken}` }
    }, {
      supplierId: 1, // Ramon (already verified demo supplier)
      deliveryAddress: 'CPG Avenue, Tagbilaran City',
      items: [{ productId: 1, quantity: 5 }]
    });
    assert(orderVerified.status === 201 && orderVerified.data.orderId, 'Verified Business Owner successfully placed an order');
    const newOrderId = orderVerified.data?.orderId;
    const newReceiptNumber = orderVerified.data?.receiptNumber;
    assert(newReceiptNumber && newReceiptNumber.startsWith('RCP-'), `Unique Receipt Number generated: ${newReceiptNumber}`);

    // ---------------------------------------------------------
    // TEST 6: Order Receipts and Printing
    // ---------------------------------------------------------
    console.log('\n--- 6. Testing Order Receipts & Calculations ---');

    // 6a. Retrieve receipt right after placement (Unpaid status)
    const receiptOrderPlaced = await request(`/orders/${newOrderId}/receipt`, {
      headers: { Authorization: `Bearer ${refreshedOwnerToken}` }
    });
    if (receiptOrderPlaced.status !== 200) {
      console.log('receiptOrderPlaced failed:', receiptOrderPlaced.status, receiptOrderPlaced.data);
    }
    assert(receiptOrderPlaced.status === 200, 'Retrieved order receipt successfully');
    const rData = receiptOrderPlaced.data;
    assert(rData.ReceiptNumber === newReceiptNumber, 'Receipt number matches order placement');
    assert(rData.PaymentStatus === 'Unpaid', 'Receipt is correctly labeled "Unpaid" before payment');
    assert(rData.ReceiptType === 'Order Receipt', 'Receipt type is "Order Receipt"');
    assert(Array.isArray(rData.items) && rData.items.length === 1, 'Receipt includes itemized list');
    assert(rData.Subtotal > 0 && rData.TotalAmount === rData.Subtotal + rData.DeliveryFee - rData.DiscountAmount, 'Receipt calculations match: Subtotal + Fee - Discount = TotalAmount');
    assert(rData.tenant?.BusinessName && rData.supplier?.SupplierName, 'Receipt includes buyer and seller business details');

    // 6b. Process payment with GCash
    console.log('\n--- 7. Testing Payment Receipt Confirmation ---');
    const payRes = await request(`/orders/${newOrderId}/pay`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshedOwnerToken}` }
    }, {
      paymentMethod: 'GCash',
      notes: 'Paid via GCash Mobile'
    });
    assert(payRes.status === 200, 'Payment confirmed successfully');
    assert(payRes.data.paymentReference && payRes.data.paymentReference.startsWith('TXN-GCASH-'), `Generated Payment Reference: ${payRes.data.paymentReference}`);

    // 6c. Retrieve receipt after payment (Paid status)
    const receiptPaid = await request(`/orders/${newOrderId}/receipt`, {
      headers: { Authorization: `Bearer ${refreshedOwnerToken}` }
    });
    assert(receiptPaid.data.PaymentStatus === 'Paid', 'Receipt PaymentStatus transitioned to "Paid"');
    assert(receiptPaid.data.ReceiptType === 'Payment Receipt', 'Receipt type transitioned to "Payment Receipt"');
    assert(receiptPaid.data.PaymentReference === payRes.data.paymentReference, 'Receipt includes authentic transaction reference');
    assert(receiptPaid.data.PaidAt !== null, 'Receipt includes PaidAt timestamp');

    // 6d. Supplier can also view receipt for their order
    const suppViewReceipt = await request(`/orders/${newOrderId}/receipt`, {
      headers: { Authorization: `Bearer ${ramonToken}` }
    });
    assert(suppViewReceipt.status === 200 && suppViewReceipt.data.OrderID === newOrderId, 'Supplier can view receipt for orders assigned to them');

    // 6e. Admin can view any receipt
    const adminViewReceipt = await request(`/orders/${newOrderId}/receipt`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminViewReceipt.status === 200 && adminViewReceipt.data.OrderID === newOrderId, 'Admin can view any receipt');

    // ---------------------------------------------------------
    // TEST 7: Tenant Isolation & Security Enforcements
    // ---------------------------------------------------------
    console.log('\n--- 8. Testing Tenant Isolation & Security ---');

    // 7a. Maria (Tenant 1) cannot view newOwner's receipt
    const mariaViewOtherReceipt = await request(`/orders/${newOrderId}/receipt`, {
      headers: { Authorization: `Bearer ${mariaToken}` }
    });
    assert(mariaViewOtherReceipt.status === 403, 'Tenant isolation: Business Owner cannot view another business receipt (403)');

    // 7b. Maria cannot view newOwner's private verification document
    const mariaViewOtherDoc = await request(`/verification/document/${verificationId}`, {
      headers: { Authorization: `Bearer ${mariaToken}` }
    });
    assert(mariaViewOtherDoc.status === 403, 'Tenant isolation: User cannot view another business verification document (403)');

    // 7c. Document owner can download/view their document
    const ownerViewDoc = await request(`/verification/document/${verificationId}`, {
      headers: { Authorization: `Bearer ${refreshedOwnerToken}` }
    });
    assert(ownerViewDoc.status === 200, 'Owner can access their own verification document');

    // 7d. Admin can view any verification document
    const adminViewDoc = await request(`/verification/document/${verificationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(adminViewDoc.status === 200, 'Admin can view verification documents');

    // 7e. Unauthenticated requests blocked
    const noAuthReceipt = await request(`/orders/${newOrderId}/receipt`);
    assert(noAuthReceipt.status === 401, 'Unauthenticated receipt access blocked (401)');

    const noAuthVerif = await request(`/verification/my-status`);
    assert(noAuthVerif.status === 401, 'Unauthenticated verification access blocked (401)');

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
    await db.end().catch(() => {});
  }

  console.log('\n========================================================');
  console.log(` Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
