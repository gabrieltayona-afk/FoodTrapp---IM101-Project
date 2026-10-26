# 🥦 FoodTrapp — Food Supply Network

> A full-stack web platform connecting business owners with food vendors. Businesses can browse supplier catalogues, place bulk orders, track deliveries, and manage invoices — all through a secured, multi-tenant environment backed by a production cloud database.

---

## 📋 Table of Contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Installation & Setup](#-installation--setup)
- [Running the Project](#-running-the-project)
- [Database Deliverables](#-database-deliverables)
- [Team Members & Contributions](#-team-members--contributions)
- [Contributor Setup](#-contributor-setup)

---

## ✨ Features

- **Multi-tenant Authentication** — JWT-based login with role-aware session resolution (`tenant`, `supplier`)
- **Supplier Catalogue Management** — Add, update, and toggle product availability per supplier
- **Bulk Order Placement** — Atomic order creation with row-level locking to prevent race conditions
- **Order Lifecycle Tracking** — Place → Deliver → Invoice → Pay pipeline with full status transitions
- **Automated Inventory Deduction** — Triggers auto-deduct stock on order creation
- **Invoice & Delivery Scheduling** — Integrated invoicing with payment processing and delivery tracking
- **Audit Logging** — Engine-level transaction logging on all order and product mutations
- **Rate Limiting & Security Headers** — Helmet.js + express-rate-limit on all API routes
- **Cloud Database with SSL** — Hosted on Aiven MySQL with certificate-based encrypted connections

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 6, Lucide React |
| **Backend** | Node.js, Express 4 |
| **Database** | MySQL (Aiven Cloud) |
| **Auth** | JSON Web Tokens (jsonwebtoken), bcryptjs |
| **Security** | Helmet.js, express-rate-limit, SSL/TLS (ca.pem) |
| **Email** | Nodemailer |
| **ORM / Driver** | mysql2 |
| **Version Control** | Git + GitHub (branch-protected, PR workflow) |

---

## 📁 Folder Structure

```
FoodTrapp---IM101-Project/
├── backend/
│   ├── server.js           # Express app entry point — all API routes
│   ├── migrate.js          # Database migration runner
│   ├── env.example         # Environment variable template
│   ├── test_all_flows.cjs  # End-to-end API flow tests
│   └── package.json
├── frontend/
│   ├── index.html          # App shell
│   ├── main.jsx            # React entry point + all UI components
│   ├── style.css           # Global styles
│   ├── vite.config.js      # Vite build config
│   └── package.json
├── Dump20261014.sql        # Full database schema, stored procedures, triggers & indexes
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md   # Standardized PR checklist
│   └── commit-msg.hook            # Git commit message hook (copy to .git/hooks/)
├── CONTRIBUTING.md         # Branch naming, commit standards, PR workflow
├── .gitignore
└── README.md
```

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- Access credentials to the Aiven MySQL cloud database
- The `ca.pem` SSL certificate file (obtained from the Git Administrator)

### 1. Clone the repository
```bash
git clone https://github.com/gabrieltayona-afk/FoodTrapp---IM101-Project.git
cd FoodTrapp---IM101-Project
```

### 2. Install backend dependencies
```bash
cd backend
npm install
```

### 3. Configure backend environment
```bash
# Copy the template and fill in your values
cp env.example .env
```

Edit `.env` with your credentials:
```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173

DB_HOST=YOUR_AIVEN_HOST
DB_PORT=YOUR_AIVEN_PORT
DB_USER=YOUR_RESTRICTED_DB_USER
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=food_supply_network
DB_CA_PATH=./ca.pem

JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

> [!IMPORTANT]
> Place the `ca.pem` SSL certificate file inside the `backend/` folder. This file is required for the encrypted connection to Aiven and is **not** included in the repository. Request it from the Git Administrator.

### 4. Install frontend dependencies
```bash
cd ../frontend
npm install
```

---

## 🚀 Running the Project

Open **two terminals** simultaneously:

**Terminal 1 — Backend API**
```bash
cd backend
npm run dev
# Server runs at http://localhost:3001
```

**Terminal 2 — Frontend UI**
```bash
cd frontend
npm run dev
# UI runs at http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

---

## 🗄 Database Deliverables

The full database implementation is contained in `Dump20261014.sql` and includes:

### Session Helper Functions
- `fn_current_tenant_id()`, `fn_current_supplier_id()`, `fn_current_user_id()` — Multi-tenant identity resolution for session-scoped operations.

### Stored Procedures
| Procedure | Purpose |
|---|---|
| `sp_place_bulk_order` | Atomic order creation with `FOR UPDATE` row locking — eliminates race conditions |
| `sp_complete_order` | Transitions pending orders to delivered and generates invoice records |
| `sp_cancel_order` | Cancels orders and automatically restores inventory stock |
| `sp_add_product` | Adds new products to a supplier's catalogue |
| `sp_update_product_catalog` | Updates existing product details |
| `sp_toggle_product_status` | Activates or deactivates product listings |
| `sp_process_invoice_payment` | Handles invoice payment processing |
| `sp_update_delivery_schedule` | Updates delivery tracking and scheduling records |

### Automated Triggers
| Trigger | Event | Effect |
|---|---|---|
| `trg_orderdetail_after_insert` | `AFTER INSERT` on order details | Automatically deducts inventory stock |
| `trg_product_after_update` | `AFTER UPDATE` on products | Logs mutations to `auditlog` table |
| `trg_orders_after_update` | `AFTER UPDATE` on orders | Logs order status changes to `auditlog` |

### Optimization Indexes
Composite B-Tree indexes on core operational tables (`orders`, `product`, `invoice`) to improve query execution plans on high-frequency operations.

---

## 👥 Team Members & Contributions

### Jandro Thomas Valloso
**Role:** Lead Database Administrator (DBA) & Cloud Infrastructure Engineer

- Designed the full relational schema and entity-relationship model
- Implemented the physical database on Aiven MySQL cloud hosting
- Enforced database-level security policies and user privilege controls
- Managed production cloud environment configuration and SSL setup
- Executed remote database backups and restoration procedures

---

### Jose Gabriel Menelito Tayona
**Role:** Lead Database Programmer & Query Optimization Engineer

- Authored all server-side stored procedures (`sp_place_bulk_order`, `sp_complete_order`, `sp_cancel_order`, and others)
- Implemented multi-tenant session helper functions
- Built automated audit triggers (`trg_orderdetail_after_insert`, `trg_product_after_update`, `trg_orders_after_update`)
- Designed and applied composite B-Tree indexing strategies for query optimization
- Benchmarked and analyzed execution plans for performance bottlenecks

---

### John Rey Cabarubias
**Role:** Frontend/UI Connector & Git Workflow Administrator

- Built the React frontend UI and all user-facing forms
- Developed the Express backend API routes connecting the UI to the database
- Implemented JWT authentication flow and UI session binding
- Initialized the Git repository and connected it to GitHub
- Established branch protection rules and enforced the PR-based workflow
- Administered all team code reviews and branch merges

---

## 🔧 Contributor Setup

Every team member must install the commit message hook locally **after cloning**. This hook enforces the project's commit message standards and will reject commits with generic descriptions.

### Install the hook

**Windows (PowerShell):**
```powershell
copy .github\commit-msg.hook .git\hooks\commit-msg
```

**macOS / Linux:**
```bash
cp .github/commit-msg.hook .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

### Test the hook
```bash
# This should be REJECTED:
git commit -m "fixed stuff"

# This should be ACCEPTED:
git commit -m "feat: add order cancellation form with stock restoration"
```

### Valid commit prefixes
| Prefix | Use for |
|---|---|
| `feat:` | New feature or UI component |
| `fix:` | Bug fix or syntax correction |
| `db:` | Database logic (triggers, procedures, indexes) |
| `docs:` | README, comments, documentation |
| `refactor:` | Code restructuring without functional change |
| `chore:` | Config, tooling, `.gitignore` |
| `test:` | Test scripts or queries |

> [!IMPORTANT]
> Commits that do not follow this format will be **blocked locally** and will not be accepted in Pull Requests. All changes must be submitted via a PR and reviewed by the Git Administrator before merging to `main`.

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the full branch naming and PR workflow guide.
