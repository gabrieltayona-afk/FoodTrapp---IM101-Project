# 🥦 FoodTrapp — Food Supply Network

> A full-stack web platform connecting business owners with food suppliers. FoodTrapp allows businesses to browse product catalogues, place bulk orders, track order and payment statuses, view receipts, and manage their food supply needs through a role-based web application.

---

## 🌐 Live Deployment

FoodTrapp is deployed online using the following services:

- **Frontend:** [FoodTrapp Web Application](https://food-supply-network.vercel.app) — hosted on Vercel.
- **Backend API:** [FoodTrapp Backend](https://foodtrapp-im101-project.onrender.com) — hosted on Render.
- **Database:** MySQL hosted on Aiven Cloud with an encrypted SSL connection.

The deployed application has been tested for the following features:

- Admin dashboard and system overview
- Product catalogue and inventory display
- Order management and payment status display
- Business and supplier shop listings
- Individual business details and order history
- Payment receipt display
- Business verification submission and review
- Verification status updates
- Admin profile settings

The application uses separate frontend, backend, and database services. The website can be accessed online without running the application locally, although the backend may take time to respond if its hosting service is waking from sleep.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Folder Structure](#-folder-structure)
- [Installation & Setup](#️-installation--setup)
- [Running the Project](#-running-the-project)
- [Database Deliverables](#-database-deliverables)
- [Team Members & Contributions](#-team-members--contributions)
- [Contributor Setup](#-contributor-setup)

---

## ✨ Features

- **Role-Based Authentication** — Login and access features based on the user's assigned role.
- **Admin Dashboard** — View system information, products, orders, and registered businesses.
- **Business Verification** — Submit business documents, review applications, and manage verification statuses.
- **Supplier Catalogue Management** — Browse products, categories, prices, and available stock.
- **Order Management** — View orders, their statuses, payment information, and totals.
- **Business Information** — View business details, contact information, and order history.
- **Payment Receipts** — Display receipt information, product quantities, prices, and order totals.
- **Inventory Management** — Display product stock levels and availability.
- **Order and Delivery Tracking** — View order and shipment statuses.
- **Cloud Database Connectivity** — Connect to a hosted MySQL database using SSL.
- **Security** — Uses JWT authentication, password hashing, and backend security middleware.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 6, Lucide React |
| Backend | Node.js, Express 4 |
| Database | MySQL (Aiven Cloud) |
| Authentication | JSON Web Tokens (JWT), bcryptjs |
| Security | Helmet.js, express-rate-limit, SSL/TLS |
| Email | Nodemailer |
| Database Driver | mysql2 |
| Version Control | Git and GitHub |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Database Hosting | Aiven Cloud |

---

## 📁 Folder Structure

```text
FoodTrapp---IM101-Project/
├── backend/
│   ├── server.js
│   ├── migrate.js
│   ├── env.example
│   ├── test_all_flows.cjs
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── main.jsx
│   ├── style.css
│   ├── vite.config.js
│   └── package.json
├── Dump20261014.sql
├── .github/
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── commit-msg.hook
├── CONTRIBUTING.md
├── .gitignore
└── README.md
```

*Note: The listing shows the main project files. Additional local configuration and private backup files may exist but should not be committed to the repository.*

---

## ⚙️ Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- Git
- Access to the MySQL database, if using the hosted database
- The required SSL certificate (`ca.pem`) for an encrypted Aiven connection

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

### 3. Configure backend environment variables

Create a `.env` file in the `backend` folder using `env.example` as a reference.

Example configuration:

```env
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173

DB_HOST=YOUR_AIVEN_HOST
DB_PORT=YOUR_AIVEN_PORT
DB_USER=YOUR_DATABASE_USER
DB_PASSWORD=YOUR_DATABASE_PASSWORD
DB_NAME=food_supply_network
DB_CA_PATH=./ca.pem

JWT_SECRET=YOUR_LONG_RANDOM_SECRET
```

Replace the example values with the appropriate credentials and configuration for your environment.

**Important:**

- Never commit `.env` files or database passwords to GitHub.
- Place the required `ca.pem` certificate inside the `backend` folder.
- Keep the SSL certificate and database credentials private.
- The hosted frontend and backend use their own deployment environment variables.

### 4. Install frontend dependencies

Open a terminal at the project root and run:

```bash
cd frontend
npm install
```

---

## 🚀 Running the Project

To run FoodTrapp locally, open two terminals.

### Terminal 1 — Backend API

From the project root:

```bash
cd backend
npm run dev
```

The backend is expected to run at:

```text
http://localhost:3001
```

### Terminal 2 — Frontend UI

From the project root:

```bash
cd frontend
npm run dev
```

The frontend is expected to run at:

```text
http://localhost:5173
```

Open the frontend URL in your browser to access the locally running application.

*Note: The commands above assume the corresponding scripts are configured in the project's package files.*

---

## 🗄 Database Deliverables

The project includes `Dump20261014.sql`, which documents the database implementation.

The README's original database documentation lists the following components.

### Session Helper Functions

- `fn_current_tenant_id()` — Resolves the current tenant ID.
- `fn_current_supplier_id()` — Resolves the current supplier ID.
- `fn_current_user_id()` — Resolves the current user ID.

### Stored Procedures

| Procedure | Purpose |
|---|---|
| `sp_place_bulk_order` | Creates bulk orders using transaction and row-locking logic. |
| `sp_complete_order` | Handles order completion and invoice generation. |
| `sp_cancel_order` | Cancels orders and restores inventory stock. |
| `sp_add_product` | Adds a product to a supplier catalogue. |
| `sp_update_product_catalog` | Updates existing product details. |
| `sp_toggle_product_status` | Activates or deactivates product listings. |
| `sp_process_invoice_payment` | Handles invoice payment processing. |
| `sp_update_delivery_schedule` | Updates delivery schedules. |

### Automated Triggers

| Trigger | Event | Purpose |
|---|---|---|
| `trg_orderdetail_after_insert` | After inserting order details | Deducts inventory stock. |
| `trg_product_after_update` | After updating a product | Records product changes in the audit log. |
| `trg_orders_after_update` | After updating an order | Records order status changes in the audit log. |

### Optimization Indexes

The original database documentation describes composite B-tree indexes on operational tables, including `orders`, `product`, and `invoice`, to support query performance.

*Note: The database objects listed above are based on the project's existing documentation. Their current presence and behavior should be verified against the actual database dump before being treated as independently tested.*

---

## 👥 Team Members & Contributions

The following roles and contributions are documented in the original project README.

### Jandro Thomas Valloso

**Role:** Lead Database Administrator (DBA) & Cloud Infrastructure Engineer

- Designed the relational schema and entity-relationship model.
- Implemented the MySQL database on Aiven Cloud.
- Managed database security policies and user privileges.
- Managed cloud environment configuration and SSL setup.
- Performed remote database backup and restoration procedures.

### Jose Gabriel Menelito Tayona

**Role:** Lead Database Programmer & Query Optimization Engineer

- Developed server-side stored procedures.
- Implemented multi-tenant session helper functions.
- Developed database audit triggers.
- Designed composite B-tree indexing strategies.
- Analyzed query execution plans and performance.

### John Rey Cabarubias

**Role:** Frontend/UI Connector & Git Workflow Administrator

- Developed the React frontend interface and user-facing forms.
- Developed backend API routes connecting the interface to the database.
- Implemented JWT authentication and UI session handling.
- Initialized the Git repository and connected it to GitHub.
- Established branch protection and pull-request workflows.
- Managed code reviews and branch merges.

*Team roles are retained from the original README and should be confirmed by the group before submission.*

---

## 🔧 Contributor Setup

Team members should install the project's commit message hook after cloning the repository.

### Install the hook

**Windows (PowerShell):**

```powershell
Copy-Item .github\commit-msg.hook .git\hooks\commit-msg
```

**macOS / Linux:**

```bash
cp .github/commit-msg.hook .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
```

### Commit Message Format

The project uses the following commit prefixes:

| Prefix | Use |
|---|---|
| `feat:` | New feature or UI component |
| `fix:` | Bug fix or syntax correction |
| `db:` | Database logic, triggers, procedures, or indexes |
| `docs:` | README, comments, or documentation |
| `refactor:` | Code restructuring without functional changes |
| `chore:` | Configuration, tooling, or `.gitignore` |
| `test:` | Test scripts or queries |

Example:

```bash
git commit -m "docs: update deployment information in README"
```

Refer to [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the project's branch naming and pull-request workflow.

If branch protection and pull-request rules are enabled, submit documentation changes through the required review process before merging them into the main branch.

---

## 📌 Project Status

FoodTrapp has been deployed online, and the frontend, backend, and hosted database have been connected successfully.

The live application has been tested for login, dashboard data display, product listings, order listings, business details, receipt display, and business verification workflows.

Further testing may be required for features and operations not covered by these checks.
