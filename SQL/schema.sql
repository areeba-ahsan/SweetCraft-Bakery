-- ============================================================
-- SweetCraft Bakery — Oracle 11g Schema
-- Uses SEQUENCE + TRIGGER for auto-increment IDs
-- (Oracle 11g does NOT support "GENERATED ALWAYS AS IDENTITY" —
-- that syntax only exists from Oracle 12c onward.)
-- ============================================================

SET DEFINE OFF;

-- ---------------- Clean slate (safe to re-run; errors on first run are fine) ----------------
DROP TRIGGER users_bir;
DROP TRIGGER products_bir;
DROP TRIGGER cart_items_bir;
DROP TRIGGER orders_bir;
DROP TRIGGER order_items_bir;
DROP TRIGGER reviews_bir;

DROP TABLE order_items PURGE;
DROP TABLE orders PURGE;
DROP TABLE cart_items PURGE;
DROP TABLE reviews PURGE;
DROP TABLE products PURGE;
DROP TABLE users PURGE;

DROP SEQUENCE users_seq;
DROP SEQUENCE products_seq;
DROP SEQUENCE cart_items_seq;
DROP SEQUENCE orders_seq;
DROP SEQUENCE order_items_seq;
DROP SEQUENCE reviews_seq;

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE users (id NUMBER PRIMARY KEY, full_name VARCHAR2(150) NOT NULL, email VARCHAR2(150) NOT NULL UNIQUE, password VARCHAR2(255) NOT NULL, phone VARCHAR2(30), address VARCHAR2(400), role VARCHAR2(20) DEFAULT 'CUSTOMER' NOT NULL, created_at TIMESTAMP DEFAULT SYSTIMESTAMP);

CREATE SEQUENCE users_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER users_bir
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT users_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE products (id NUMBER PRIMARY KEY, category VARCHAR2(50) NOT NULL, name VARCHAR2(200) NOT NULL, price NUMBER(10,2) NOT NULL, tag VARCHAR2(100), image_url VARCHAR2(500), created_at TIMESTAMP DEFAULT SYSTIMESTAMP);

CREATE SEQUENCE products_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER products_bir
BEFORE INSERT ON products
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT products_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

-- ============================================================
-- CART ITEMS
-- ============================================================
CREATE TABLE cart_items (id NUMBER PRIMARY KEY, user_id NUMBER NOT NULL REFERENCES users(id) ON DELETE CASCADE, product_id NUMBER NOT NULL REFERENCES products(id) ON DELETE CASCADE, quantity NUMBER DEFAULT 1 NOT NULL, added_at TIMESTAMP DEFAULT SYSTIMESTAMP, CONSTRAINT uq_cart_user_product UNIQUE (user_id, product_id));

CREATE SEQUENCE cart_items_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER cart_items_bir
BEFORE INSERT ON cart_items
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT cart_items_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (id NUMBER PRIMARY KEY, user_id NUMBER REFERENCES users(id), customer_name VARCHAR2(150), customer_phone VARCHAR2(30), customer_address VARCHAR2(400), total_price NUMBER(10,2), status VARCHAR2(30) DEFAULT 'Pending' NOT NULL, order_date TIMESTAMP DEFAULT SYSTIMESTAMP);

CREATE SEQUENCE orders_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER orders_bir
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT orders_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

-- ============================================================
-- ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (id NUMBER PRIMARY KEY, order_id NUMBER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, product_id NUMBER REFERENCES products(id), product_name VARCHAR2(200), category VARCHAR2(50), quantity NUMBER DEFAULT 1, unit_price NUMBER(10,2));

CREATE SEQUENCE order_items_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER order_items_bir
BEFORE INSERT ON order_items
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT order_items_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (id NUMBER PRIMARY KEY, user_id NUMBER REFERENCES users(id), name VARCHAR2(150), rating NUMBER(1) CHECK (rating BETWEEN 1 AND 5), comment VARCHAR2(1000), created_at TIMESTAMP DEFAULT SYSTIMESTAMP);

CREATE SEQUENCE reviews_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE TRIGGER reviews_bir
BEFORE INSERT ON reviews
FOR EACH ROW
BEGIN
  IF :NEW.id IS NULL THEN
    SELECT reviews_seq.NEXTVAL INTO :NEW.id FROM dual;
  END IF;
END;
/

COMMIT;

-- ============================================================
-- SEED PRODUCTS (matches the customer-facing menu categories)
-- ============================================================
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Korean Buttercream Pastel',18.00,'Best Seller','https://images.unsplash.com/photo-1621303837174-89787a7d4729?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Vintage Rosette Mini',20.00,'Trending','https://images.unsplash.com/photo-1551879403-6adb554966fd?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Custom Message Cake',22.00,'Customizable','https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Minimalist Lavender Honey',22.00,'Floral','https://images.unsplash.com/photo-1545696563-af8f6ec2295a?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Strawberry Shortcake Dream',24.00,'Fresh Fruit','https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Matcha Pistachio Zen',25.00,'Specialty','https://images.unsplash.com/photo-1577998474517-7eeeed4e448a?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Triple Dark Chocolate Fudge',23.00,'Rich','https://images.unsplash.com/photo-1602351447937-745cb720612f?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Vanilla Bean & Raspberry',22.00,'Classic','https://images.unsplash.com/photo-1578922864601-79dcc7cbcea9?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Caramel Biscoff Crunch',24.00,'Popular','https://images.unsplash.com/photo-1486427944299-d1955d23e34d?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cakes','Red Velvet Silk',23.50,'Fan Favorite','https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?auto=format&fit=crop&w=400&q=80');

INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Pastel Floral Dream (3-Tier)',280.00,'Signature','https://images.unsplash.com/photo-1623428454614-abaf00244e52?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Minimalist Pearl Tier',220.00,'Classic','https://images.unsplash.com/photo-1574538860416-baadc5d4ec57?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Ethereal Watercolor Cake',250.00,'Artisanal','https://images.unsplash.com/photo-1542007920-992d2c424d09?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Vintage Botanical Lace',260.00,'Intricate','https://images.unsplash.com/photo-1519654793190-2e8a4806f1f2?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Terracotta & Gold Leaf Tier',290.00,'Luxury','https://images.unsplash.com/photo-1604702433171-33756f3f3825?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Rustic Berry & Fig Grandeur',240.00,'Rustic','https://images.unsplash.com/photo-1565661834013-d196ca46e14e?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Blush Rose Quartz (4-Tier)',320.00,'Grand','https://images.unsplash.com/photo-1581745069539-1e60d7f965f4?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Eucalyptus Minimalist White',210.00,'Modern','https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Cascading Sugar Orchids',310.00,'Elegant','https://images.unsplash.com/photo-1503525642560-ecca5e2e49e9?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('wedding','Champagne & Elderflower Glow',275.00,'Gourmet','https://images.unsplash.com/photo-1595272568891-123402d0fb3b?auto=format&fit=crop&w=400&q=80');

INSERT INTO products (category, name, price, tag, image_url) VALUES ('brownies','Nutella Swirl Squares',16.00,'Rich','https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('brownies','Pastel M&M Fudge Bites',14.00,'Kids Choice','https://images.unsplash.com/photo-1610611424854-5e07032143d8?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('brownies','Belgian Dark Chocolate Chunk',15.00,'Classic','https://images.unsplash.com/photo-1629856428041-6f9721807b05?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('brownies','Peanut Butter Marble Fudge',16.50,'Nutty','https://images.unsplash.com/photo-1515037893149-de7f840978e2?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('brownies','Espresso Mocha Brownie',16.00,'Coffee','https://images.unsplash.com/photo-1606313564573-104197cf8f91?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('brownies','Raspberry Dark Cocoa Swirl',16.00,'Fruity','https://images.unsplash.com/photo-1589218436045-ee320057f443?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('brownies','Campfire S''mores Fudge Box',17.00,'Gooey','https://images.unsplash.com/photo-1461009312844-e80697a81cc7?auto=format&fit=crop&w=400&q=80');

INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Pink Glaze Pastel Sprinkles',3.50,'Best Seller','https://images.unsplash.com/photo-1631816503348-3d4c760e09e4?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Belgian Chocolate Ring',3.75,'Classic','https://images.unsplash.com/photo-1551106652-a5bcf4b29ab6?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Vanilla Lavender Frosting',4.00,'Floral','https://images.unsplash.com/photo-1637614052127-80276701a4e8?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Strawberry Cream Bomb',4.25,'Stuffed','https://images.unsplash.com/photo-1533910534207-90f31029a78e?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Salted Caramel Pecan Crunch',4.50,'Gourmet','https://images.unsplash.com/photo-1464350042148-1eb1e52943f7?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Matcha Green Tea Glaze',4.00,'Specialty','https://images.unsplash.com/photo-1570727624862-3008fe67a6be?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Boston Cream Velvet',4.50,'Fan Favorite','https://images.unsplash.com/photo-1587458423887-4f8d224134a9?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Blueberry Lemon Zest',3.85,'Citrus','https://images.unsplash.com/photo-1665344395993-2b66f768f7bb?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Triple Chocolate Sprinkle',4.10,'Decadent','https://images.unsplash.com/photo-1562945431-ce2b63d5a7fe?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('donuts','Classic Glazed Ring',3.25,'Simple','https://images.unsplash.com/photo-1535568824865-a801351e8483?auto=format&fit=crop&w=400&q=80');

INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Chocolate Frosting Trio',4.00,'Fan Favorite','https://images.unsplash.com/photo-1640806354740-d47c98c190ea?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Double Chocolate Delight',4.25,'Rich','https://images.unsplash.com/photo-1603532648955-039310d9ed75?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Strawberry Pink Swirl',3.75,'Best Seller','https://images.unsplash.com/photo-1599785209707-a456fc1337bb?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Classic Vanilla Cupcake',3.50,'Classic','https://images.unsplash.com/photo-1612203985729-70726954388c?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Golden Vanilla Bean Cupcake',4.10,'Elegant','https://plus.unsplash.com/premium_photo-1663840297386-8a3e38271ac6?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Floral Fondant Bouquet',4.50,'Elegant','https://images.unsplash.com/photo-1521309918586-feb7aa79a61b?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Mint Teal Cream Cupcake',4.00,'Specialty','https://images.unsplash.com/photo-1486428128344-5413e434ad35?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Golden Butter Cupcake',3.75,'Trending','https://images.unsplash.com/photo-1426869884541-df7117556757?auto=format&fit=crop&w=400&q=80');
INSERT INTO products (category, name, price, tag, image_url) VALUES ('cupcakes','Red Velvet Ruby Cupcake',4.25,'Popular','https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?auto=format&fit=crop&w=400&q=80');

COMMIT;

-- ============================================================
-- CREATE YOUR ADMIN ACCOUNT (2 steps)
-- ============================================================
-- Step 1: Register a normal account through the app / Postman:
--   POST http://localhost:5000/api/auth/register
--   { "fullName": "Areeba Admin", "email": "admin@sweetcraft.com",
--     "password": "yourpassword", "phone": "0300...", "address": "..." }
--
-- Step 2: Promote that account to ADMIN by running this (edit the email):
--   UPDATE users SET role = 'ADMIN' WHERE email = 'admin@sweetcraft.com';
--   COMMIT;
-- ============================================================