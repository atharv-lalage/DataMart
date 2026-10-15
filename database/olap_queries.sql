-- OLAP Operations (ROLAP)

-- 1. Roll-up: Total sales per year
SELECT 
    dt.year, 
    SUM(sf.amount) as total_sales
FROM 
    ecom_sales_fact sf
JOIN 
    ecom_dim_time dt ON sf.date_id = dt.date_id
GROUP BY 
    dt.year
ORDER BY 
    dt.year;

-- 2. Drill-down: Total sales broken down by year, month, and day
SELECT 
    dt.year, 
    dt.month, 
    dt.day, 
    SUM(sf.amount) as total_sales
FROM 
    ecom_sales_fact sf
JOIN 
    ecom_dim_time dt ON sf.date_id = dt.date_id
GROUP BY 
    dt.year, dt.month, dt.day
ORDER BY 
    dt.year, dt.month, dt.day;

-- 3. Slice: Filter by a specific category
SELECT 
    dp.name, 
    SUM(sf.amount) as category_sales
FROM 
    ecom_sales_fact sf
JOIN 
    ecom_dim_product dp ON sf.product_id = dp.product_id
JOIN 
    ecom_dim_category dc ON dp.category_id = dc.category_id
WHERE 
    dc.category_name = 'Gift' -- Example category
GROUP BY 
    dp.name;

-- 4. Dice: Filter by category and year
SELECT 
    dc.category_name, 
    dt.year, 
    SUM(sf.amount) as total_sales
FROM 
    ecom_sales_fact sf
JOIN 
    ecom_dim_product dp ON sf.product_id = dp.product_id
JOIN 
    ecom_dim_category dc ON dp.category_id = dc.category_id
JOIN 
    ecom_dim_time dt ON sf.date_id = dt.date_id
WHERE 
    dc.category_name IN ('Gift', 'Decoration') -- Example categories
    AND dt.year IN (2010, 2011)               -- Example years
GROUP BY 
    dc.category_name, dt.year
ORDER BY 
    dt.year, dc.category_name;
