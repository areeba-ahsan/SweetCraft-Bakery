# SweetCraft Bakery

A full-stack e-commerce web application for a custom cake and bakery business, built with React, Node.js/Express, and PostgreSQL. Customers can browse the menu, manage a cart, place orders, and leave reviews, while administrators have a dedicated dashboard to manage products, orders, and reviews in real time.

**Live Application:** [https://your-app.vercel.app](https://sweet-craft-bakery.vercel.app/)
**Backend API:** [https://sweetcraft-bakery-production.up.railway.app](https://sweetcraft-bakery-production.up.railway.app)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Author](#author)

---

## Overview

SweetCraft Bakery is a complete online ordering system for a bakery offering cakes, wedding cakes, brownies, donuts, and cupcakes. The application supports two roles through a single login gate:

- **Customers** can register, browse the menu by category, add items to a persistent cart, check out, track order history, and leave star ratings and reviews.
- **Administrators** have access to a management dashboard for viewing revenue and order metrics, updating order statuses, managing menu items across all categories, and moderating customer reviews.

The project was built as an exercise in designing and shipping a production-style full-stack application, covering relational schema design, authentication, REST API design, responsive UI development, and cloud deployment.

---

## Features

**Customer**
- Email and password registration and login with hashed passwords and JWT-based sessions
- Browse products across five categories: Cakes, Wedding Cakes, Brownies, Donuts, and Cupcakes
- Add items to cart, adjust quantities, and remove items, with the cart persisting per account
- Checkout with delivery phone number and address, generating a confirmed order
- Order history with live status tracking (Pending, Baking, Ready for Pickup, Delivered)
- Submit and browse star-rated customer reviews

**Administrator**
- Dashboard overview showing revenue, active orders, delivered orders, and average rating
- Full order list with status update controls
- Menu management: add, edit, and delete products by category
- Review moderation, including the ability to remove inappropriate reviews

**Engineering**
- RESTful JSON API with route-level authentication and role-based access control
- Password hashing with bcrypt and stateless authentication via JWT
- Relational schema with foreign keys and cascading deletes across users, cart, orders, and reviews
- Deployed as three independently hosted services: frontend, backend, and database

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Create React App) |
| Backend | Node.js, Express 5 |
| Database | PostgreSQL, hosted on Neon |
| Authentication | JWT (jsonwebtoken) with bcryptjs password hashing |
| Frontend Hosting | Vercel |
| Backend Hosting | Railway |

---

## Architecture

```
+----------------------+        HTTPS/JSON        +------------------------+        SQL         +----------------------+
|   React Frontend      |  ------------------------>|   Express REST API      | -------------------->|   PostgreSQL (Neon)   |
|   (Vercel)             | <------------------------ |   (Railway)              | <-------------------- |                        |
+----------------------+        JWT-authenticated   +------------------------+                     +----------------------+
```

The frontend never communicates with the database directly; every read and write is routed through the Express API. Protected routes, including cart, checkout, orders, and administrative actions, require a Bearer JWT issued at login or registration. Administrator-only routes are further gated by a role claim embedded in the JWT and verified server-side.

---

## Project Structure

```
sweetcraft-cakes/
├── backend/
│   ├── middleware/
│   │   └── auth.js            # JWT verification and admin role guard
│   ├── db.js                   # PostgreSQL connection pool
│   ├── server.js               # Express application: all REST routes
│   ├── schema_postgres.sql     # Database schema and seed data
│   └── package.json
└── frontend-customer/
    └── src/
        ├── api.js               # Central API client (JWT-aware fetch wrapper)
        ├── App.js                # Authentication gate: login, register, role-based routing
        ├── customerdashboard.js
        ├── AdminDashboard.js
        └── index.js
```

---

## Getting Started

### Prerequisites
- Node.js 18 or later
- A PostgreSQL database, such as a free Neon project

### 1. Clone the repository
```bash
git clone https://github.com/areeba-ahsan/SweetCraft-Bakery.git
cd SweetCraft-Bakery
```

### 2. Set up the database
Run `backend/schema_postgres.sql` against your PostgreSQL database using the Neon SQL Editor or psql. This creates all required tables and seeds 46 starter products.

### 3. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL and JWT_SECRET in .env
npm run dev
```
The API starts on `http://localhost:5000`.

### 4. Frontend setup
```bash
cd frontend-customer
npm install
npm start
```
The application opens on `http://localhost:3000`.

### 5. Create an administrator account
Register a normal account through the application, then promote it directly in the database:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```
Log out and log back in to access the Administrator Dashboard.

---

## Environment Variables

**backend/.env**

| Variable | Description |
|---|---|
| PORT | Port the Express server listens on (default 5000) |
| JWT_SECRET | Secret key used to sign and verify JWTs |
| DATABASE_URL | PostgreSQL connection string, provided by Neon |

**Frontend (Vercel project settings)**

| Variable | Description |
|---|---|
| REACT_APP_API_BASE_URL | Deployed backend URL with /api appended, e.g. https://sweetcraft-bakery-production.up.railway.app/api |

---

## API Reference

All routes are prefixed with `/api`. Protected routes require an `Authorization: Bearer <token>` header.

| Method | Route | Auth | Description |
|---|---|---|---|
| POST | /auth/register | None | Create a customer account |
| POST | /auth/login | None | Log in; returns a JWT and user object |
| GET | /products | None | List all products, optionally filtered by category |
| POST | /products | Admin | Add a product |
| PUT | /products/:id | Admin | Edit a product |
| DELETE | /products/:id | Admin | Delete a product |
| GET | /cart | Customer | Retrieve the logged-in user's cart |
| POST | /cart | Customer | Add an item to the cart |
| PUT | /cart/:productId | Customer | Update item quantity |
| DELETE | /cart/:productId | Customer | Remove an item from the cart |
| POST | /checkout | Customer | Convert the cart into an order |
| GET | /orders/mine | Customer | Retrieve the user's own order history |
| GET | /orders | Admin | Retrieve all orders |
| PUT | /orders/:id/status | Admin | Update an order's status |
| GET | /reviews | None | List all reviews |
| POST | /reviews | Customer | Submit a review |
| DELETE | /reviews/:id | Admin | Delete a review |

---

## Database Schema

| Table | Purpose |
|---|---|
| users | Customer and administrator accounts, including hashed password, phone, address, and role |
| products | Menu items with category, name, price, tag, and image |
| cart_items | Per-user cart, one row per user-product pair |
| orders | Order header containing customer information, total, and status |
| order_items | Line items belonging to an order |
| reviews | Star ratings and comments |

Full table definitions are available in `backend/schema_postgres.sql`.

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Automatically deploys on push to main; root directory is frontend-customer |
| Backend | Railway | Automatically deploys on push to main; root directory is backend |
| Database | Neon | Serverless PostgreSQL |

---

## Roadmap

- Online payment integration (currently cash on delivery)
- Image upload for products instead of external URLs
- Email notifications on order status changes
- Pagination for large product catalogs

---

## Author

**Areeba Ahsan**
BS Computer Science, FAST-NUCES, Chiniot-Faisalabad Campus
GitHub: https://github.com/areeba-ahsan
LinkedIn: https://linkedin.com/in/areeba-ahsan-34102a345
