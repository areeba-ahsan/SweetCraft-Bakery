<div align="center">

# SweetCraft Bakery

**A full-stack bakery e-commerce platform with dedicated Customer and Admin experiences.**

![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Framework-Express-000000?logo=express&logoColor=white)
![Oracle](https://img.shields.io/badge/Database-Oracle-F80000?logo=oracle&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-black?logo=jsonwebtokens)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

</div>

---

## Overview

SweetCraft Bakery is a two-sided web application for a bakery business:

- **Customers** can browse the menu, add items to a cart, place orders, and leave reviews.
- **Admins** can manage the product catalog, track and update live orders, and moderate customer reviews.

Both roles share a **single login page** — the backend authenticates the user and returns their role, and the frontend automatically routes them to the correct dashboard.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Demo Credentials](#demo-credentials)
- [Security](#security)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### Customer
- Browse products across 5 categories — Cakes, Wedding Cakes, Fudgy Brownies, Donuts, Cupcakes
- Add to cart, adjust quantities, and check out
- Register (name, email, phone, address, password) and log in securely
- View and submit customer reviews with star ratings

### Admin
- At-a-glance dashboard: total revenue, active orders, menu item count, average rating
- Live order management with status updates (`Pending → Baking → Ready for Pickup → Delivered`)
- Add and delete products by category
- Moderate (delete) customer reviews

### Shared
- One login page for both roles — role-based routing handled automatically
- Passwords hashed with **bcrypt**, sessions secured with **JWT**

---

## Tech Stack

| Layer         | Technology                     |
|---------------|---------------------------------|
| Frontend      | React                           |
| Backend       | Node.js, Express                |
| Database      | Oracle SQL (`oracledb` driver)  |
| Authentication| bcryptjs, jsonwebtoken (JWT)    |
| API Style     | REST                            |

---

## Project Structure

```
sweetcraft-cakes/
├── backend/
│   ├── db.js                    # Oracle connection pool setup
│   ├── server.js                # Express app & API routes
│   ├── middleware/
│   │   └── auth.js              # JWT verification & role guard
│   ├── SQL/
│   │   └── schema.sql           # Database schema (tables, sequences, triggers)
│   └── .env                     # Environment config (not committed)
│
├── frontend-admin/               # Standalone admin app (reference build)
│
└── frontend-customer/            # Main app — serves both customer & admin views
    └── src/
        ├── App.js                # Login / Register + role-based routing
        ├── customerdashboard.js  # Customer-facing dashboard
        ├── AdminDashboard.js     # Admin dashboard
        └── api.js                # Shared authenticated fetch helper
```

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- An Oracle database instance you can connect to

### 1. Clone the repository
```bash
git clone https://github.com/areeba-ahsan/SweetCraft-Bakery.git
cd SweetCraft-Bakery
```

### 2. Set up the database
Run the scripts in `backend/SQL/` against your Oracle instance to create all required tables: `users`, `products`, `cart_items`, `orders`, `order_items`, `reviews`.

### 3. Configure and start the backend
```bash
cd backend
npm install
```
Create a `.env` file (see [Environment Variables](#-environment-variables) below), then:
```bash
npm run dev
```
The API will be live at `http://localhost:5000`.

### 4. Start the frontend
```bash
cd frontend-customer
npm install
npm start
```
The app opens at `http://localhost:3000`. Logging in routes automatically to the customer or admin dashboard based on the account's role.

---

## Environment Variables

Create `backend/.env` with the following keys:

| Variable            | Description                              |
|---------------------|-------------------------------------------|
| `DB_USER`           | Oracle database username                  |
| `DB_PASSWORD`       | Oracle database password                  |
| `DB_CONNECT_STRING` | Oracle connection string                  |
| `JWT_SECRET`        | Secret key used to sign login tokens      |
| `PORT`              | Port for the backend server (default `5000`) |

> `.env` is excluded via `.gitignore` — never commit real credentials.

---

## API Reference

| Method | Endpoint                  | Auth       | Description                        |
|--------|----------------------------|------------|-------------------------------------|
| POST   | `/api/auth/register`       | —          | Create a new customer account       |
| POST   | `/api/auth/login`          | —          | Log in (customer or admin)          |
| GET    | `/api/products`            | —          | List all products                   |
| POST   | `/api/products`            | Admin      | Add a new product                   |
| PUT    | `/api/products/:id`        | Admin      | Update a product                    |
| DELETE | `/api/products/:id`        | Admin      | Delete a product                    |
| GET    | `/api/cart`                | Customer   | View the logged-in user's cart      |
| POST   | `/api/cart`                | Customer   | Add an item to the cart             |
| PUT    | `/api/cart/:productId`     | Customer   | Update item quantity                |
| DELETE | `/api/cart/:productId`     | Customer   | Remove an item from the cart        |
| POST   | `/api/checkout`             | Customer   | Convert cart into an order          |
| GET    | `/api/orders/mine`         | Customer   | View own order history              |
| GET    | `/api/orders`               | Admin      | View all orders                     |
| PUT    | `/api/orders/:id/status`   | Admin      | Update an order's status            |
| GET    | `/api/reviews`              | —          | View all reviews                    |
| POST   | `/api/reviews`              | Customer   | Submit a review                     |
| DELETE | `/api/reviews/:id`         | Admin      | Delete a review                     |

---

## Demo Credentials

| Role  | Email                          | Password    |
|-------|----------------------------------|-------------|
| Admin | `areebaahsan2412@gmail.com`      | `areeba123` |

New customer accounts can be created anytime from the **Register** tab on the login page.

---

## Security

- Passwords are never stored in plain text — hashed with **bcrypt** before saving
- Sessions are managed with **JWT**, verified on every protected route
- Admin-only routes are protected with role-based middleware

---

## Roadmap

- [ ] Order tracking notifications for customers
- [ ] Image upload support for products (instead of URL input)
- [ ] Payment gateway integration

---

## License

This project was built for educational/internship purposes.
