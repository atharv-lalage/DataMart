-- Idempotent schema setup used by the application before an ETL load.
CREATE TABLE IF NOT EXISTS ecom_users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    country VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ecom_products (
    product_id VARCHAR(50) PRIMARY KEY,
    name TEXT,
    category VARCHAR(100),
    price DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS ecom_orders (
    order_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES ecom_users(user_id),
    order_date TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ecom_order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50) REFERENCES ecom_orders(order_id),
    product_id VARCHAR(50) REFERENCES ecom_products(product_id),
    quantity INTEGER,
    amount DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS ecom_dim_category (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) UNIQUE
);

CREATE TABLE IF NOT EXISTS ecom_dim_customer (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100),
    country VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS ecom_dim_product (
    product_id VARCHAR(50) PRIMARY KEY,
    name TEXT,
    category_id INTEGER REFERENCES ecom_dim_category(category_id),
    price DECIMAL(10, 2)
);

CREATE TABLE IF NOT EXISTS ecom_dim_time (
    date_id INT PRIMARY KEY,
    full_date DATE,
    day INT,
    month INT,
    year INT,
    quarter INT,
    day_of_week INT
);

CREATE TABLE IF NOT EXISTS ecom_sales_fact (
    fact_id SERIAL PRIMARY KEY,
    order_id VARCHAR(50),
    product_id VARCHAR(50) REFERENCES ecom_dim_product(product_id),
    user_id VARCHAR(50) REFERENCES ecom_dim_customer(user_id),
    date_id INT REFERENCES ecom_dim_time(date_id),
    quantity INTEGER,
    amount DECIMAL(10, 2)
);
