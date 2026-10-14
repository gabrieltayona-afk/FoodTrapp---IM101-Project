# Database Deliverables - Tayona 
This repository contains the database schema, server-side stored procedures, automated audit triggers, helper functions, and optimization indexes.

## Implemented Database Logic
- **Session Helper Functions:** `fn_current_tenant_id()`, `fn_current_supplier_id()`, and `fn_current_user_id()` for multi-tenant identity resolution.
- **Stored Procedures:**
  - `sp_place_bulk_order`: Atomic order creation with `FOR UPDATE` row locking to eliminate race conditions.
  - `sp_complete_order`: Transitions pending orders to delivered and generates invoice records.
  - `sp_cancel_order`: Cancels orders and automatically restores inventory stock.
  - `sp_add_product`, `sp_update_product_catalog`, `sp_toggle_product_status`: Supplier catalog management routines.
  - `sp_process_invoice_payment`, `sp_update_delivery_schedule`: Invoicing and delivery tracking procedures.
- **Automated Triggers:**
  - `trg_orderdetail_after_insert`: Automatic inventory stock deduction upon order creation.
  - `trg_product_after_update` & `trg_orders_after_update`: Engine-level transaction logging to `auditlog`.
- **Optimization Indexes:** Composite B-Tree indexes on core operational tables (`orders`, `product`, `invoice`).
