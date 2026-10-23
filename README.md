# StockQR - Enterprise QR-Code Stock Management System

StockQR is a production-grade inventory and stock management system built with **Node.js, Express, React, and Vite**. It enables seamless stock inward/outward tracking through unique QR codes, real-time inventory balances, chronological transaction audit logs, and warehouse analytics.

---

## 🎯 Core Motto & Key Capabilities

1. **Unique QR Code Assignment**:
   - Every product is assigned a unique QR code generated automatically upon creation using high-density PNG encoding.
   - The QR code contains verifiable product metadata (`id`, `sku`, `name`).
2. **Stock Inward & Outward Movements**:
   - Products and stock can be added (Inward / Receipt) or removed (Outward / Dispatch).
   - Inward movements increase stock balance and record full audit details.
   - Outward movements decrease stock balance with strict safety checks against stockouts.
3. **Scan-to-Inspect (Live Balance & Transaction History)**:
   - When a product's QR code is scanned, the system instantly displays:
     - **Product Details & Status**: Active, In Stock, Low Stock Alert, Out of Stock, or Archived/Deleted.
     - **Live Stock Balance**: e.g., if Biscuit was added in quantity 10 and 8 units were removed, it displays **Current Balance: 2 units**.
     - **Recent Transaction Audit Trail**: Complete chronological list of stock movements showing +/- quantities, balance transitions (e.g. `10 → 2`), date/time, operator name, and reference notes.
4. **Lifecycle & Soft-Delete Tracking**:
   - If a product is removed/deleted from active inventory, its physical QR code on boxes or shelves remains readable.
   - Scanning displays **Status: Archived / Deleted**, the deletion timestamp, the last known balance, and historical transactions, with a one-click **Restore Product** button.
5. **Multi-Mode QR Scanner**:
   - **Live Camera Scanner**: Real-time camera feed with camera switcher (front/rear).
   - **QR Image Upload**: Drop or browse any screenshot or photo of a QR code.
   - **Manual SKU / Barcode Gun Input**: Keyboard entry with quick demo product buttons.
   - **Audio Beep Feedback**: Web Audio API tone upon successful scan.
6. **Authentication & Role-Based Access Control (RBAC)**:
   - Secure JWT authentication with bcrypt password hashing.
   - **Administrator (`admin`)**: Full permissions to create/edit/delete products, manage system users, view financial valuation, and export data.
   - **Operator (`operator`)**: Operational permissions to scan QR codes, perform inward/outward stock operations, and view inventory levels.
7. **Zero-Configuration Dual-Mode Database**:
   - **MongoDB Atlas Mode**: Connects to remote MongoDB Atlas cluster when `MONGODB_URI` is provided.
   - **Embedded Persistent Datastore**: Seamless automatic fallback to local JSON database (`backend/data/db.json`) for zero-dependency offline development or demo setups.
8. **Warehouse Operations & Reporting**:
   - **Stock Movements Ledger**: Dedicated transaction history with type and date filters.
   - **CSV Export**: One-click download of transaction reports and inventory summaries.
   - **Batch QR Label Printing**: Print-ready grid layout (`@media print`) for adhesive warehouse stickers.
   - **Inventory Valuation**: Real-time asset valuation calculated from unit costs.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────┐ ┌────────────────┐  │
│  │ Dashboard    │ │ Products     │ │ QR Scanner  │ │ Stock Ledger   │  │
│  └──────────────┘ └──────────────┘ └─────────────┘ └────────────────┘  │
│  ┌───────────────────────────────┐ ┌───────────────────────────────┐  │
│  │ Batch Label Printing          │ │ User Access Control (Admin)   │  │
│  └───────────────────────────────┘ └───────────────────────────────┘  │
│                                                                        │
│  - Context: AuthProvider (JWT + RBAC) | ToastProvider (Notifications)  │
│  - Scanner: Html5Qrcode (Camera + File Upload + Web Audio Beep)        │
│  - Styling: Modern dark/light responsive layout with Tailwind CSS      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Axios (/api)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Backend (Express.js API)                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Middleware: JWT Auth | RBAC | Rate Limiting | Validation         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Routes: /api/auth | /api/products | /api/transactions            │  │
│  │         /api/dashboard (stats, alerts, CSV exports)              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Services: ProductService | TransactionService | AuthService      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌───────────────────────────┐                     ┌───────────────────────┐
│   MongoDB Atlas Cluster   │  (Automatic Switch) │ Embedded Persistent   │
│   (When MONGODB_URI set)  │ ◄─────────────────► │ Local JSON Datastore  │
│                           │                     │ (backend/data/db.json)│
└───────────────────────────┘                     └───────────────────────┘
```

---

## 🚀 Quick Start Guide

### Default Demo Credentials

| Role | Username | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Full control, User management, Products, Ledger, CSV Export |
| **Floor Operator** | `operator` | `operator123` | QR Scanning, Inward/Outward movements, Stock inspection |

---

### Backend Setup

```bash
cd backend

# Ensure .env is configured:
# PORT=5000
# USE_LOCAL_DB=true  (or set MONGODB_URI for MongoDB Atlas)
# JWT_SECRET=your-secret-key

# Start the server
npm start
```

The API will start on `http://localhost:5000` with seeded sample products (`BISCUIT-001`, `BISCUIT-002`, `TEA-101`, `MILK-201`, `CHOC-301`).

---

### Frontend Setup

```bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite dev server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 📋 API Endpoints Reference

### Authentication
- `POST /api/auth/login` — Authenticate and receive JWT token + user profile.
- `POST /api/auth/register` — Register a new account.
- `GET /api/auth/me` — Retrieve current authenticated session.
- `GET /api/auth/users` — List system accounts (*Admin only*).
- `POST /api/auth/users` — Create user account with assigned role (*Admin only*).
- `DELETE /api/auth/users/:id` — Delete user account (*Admin only*).

### Products & QR Scanning
- `POST /api/products/scan` — **Core Motto Inspection Endpoint**: Lookup product by QR payload or SKU; returns live balance, status, and chronological transaction history.
- `GET /api/products` — List products with search, pagination, category, and status filters (`active`, `deleted`, `all`).
- `GET /api/products/categories` — List distinct product categories.
- `GET /api/products/:id` — Retrieve product details.
- `POST /api/products` — Create product (auto-generates QR code and records initial inward batch).
- `PUT /api/products/:id` — Update product details.
- `DELETE /api/products/:id` — Archive / soft-delete product (preserves QR scan history).
- `POST /api/products/:id/restore` — Restore archived product to active inventory.

### Transactions
- `POST /api/transactions` — Record inward or outward movement:
  ```json
  {
    "productId": "657100000000000000000001",
    "type": "outward",
    "quantity": 8,
    "notes": "Retail store dispatch"
  }
  ```
- `GET /api/transactions` — List transaction records with date, type, and product filters.
- `GET /api/transactions/product/:productId/history` — Get movement history for a specific product.

### Dashboard & Analytics
- `GET /api/dashboard` — Overview counts, inventory valuation, inward/outward totals, and alerts.
- `GET /api/dashboard/alerts` — Active low stock and out of stock product alerts.
- `GET /api/dashboard/export-transactions` — Download complete transactions ledger as CSV.
- `GET /api/dashboard/export-inventory` — Download inventory valuation summary as CSV.

---

## 🧪 Testing the Motto Scenario

To test the biscuit example (`10 added, 8 removed, balance: 2`):

1. **Log in** at `http://localhost:5173` using `admin` / `admin123`.
2. Navigate to **QR Scanner** (`/scan`).
3. Click the sample button **"Parle-G Biscuit"** (or scan its QR code).
   - Scanned screen displays: **Current Balance: 10 packs**, **Status: In Stock**.
   - Displays Initial Inventory transaction: `INWARD +10 units`.
4. Click **"- Stock Out (Outward)"**.
5. Enter Quantity: `8`, Notes: `"Dispatched to store"`, click **Confirm Stock Out**.
6. **Result**:
   - Balance immediately updates to **2 packs** (Status turns to **Low Stock Alert**).
   - Recent Transactions displays:
     - `OUTWARD -8 units | Balance: 10 → 2 | Dispatched to store`
     - `INWARD +10 units | Balance: 0 → 10 | Initial inventory batch`
7. Click **"Archive / Delete"** on Biscuit from the Products page:
   - Scan the Biscuit QR code again:
   - System displays **"ATTENTION: THIS PRODUCT IS ARCHIVED / DELETED"** with last known quantity `2`, preserved audit history, and a **"Restore Product"** button.

---

## 📄 License
MIT License.
