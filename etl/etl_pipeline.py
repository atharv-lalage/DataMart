import pandas as pd
from sqlalchemy import create_engine, text
import numpy as np
import os
import json
from dotenv import load_dotenv
from sqlalchemy.dialects.postgresql import insert

def insert_do_nothing(table, conn, keys, data_iter):
    data = [dict(zip(keys, row)) for row in data_iter]
    stmt = insert(table.table).values(data)
    conn.execute(stmt.on_conflict_do_nothing())

# Load environment variables from .env file up one level
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'), override=True)

DATABASE_URL = os.environ.get('DATABASE_URL')

try:
    from groq import Groq
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except Exception as e:
    groq_client = None
    print(f"Groq API not loaded: {e}")

def get_engine():
    """Return a database engine only when one was explicitly configured."""
    return create_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None


def initialize_database(engine):
    """Create the OLTP and warehouse tables without deleting existing data."""
    schema_path = os.path.join(os.path.dirname(__file__), '..', 'database', 'schema_init.sql')
    with open(schema_path, encoding='utf-8') as schema_file:
        schema = schema_file.read()
    with engine.begin() as conn:
        conn.execute(text(schema))


def clear_loaded_data(engine):
    """Clear imported operational and warehouse data before a full ETL refresh.

    The pipeline is a full snapshot load, not an incremental load. Clearing first
    prevents facts from being counted again each time the same dataset is loaded.
    """
    tables = [
        'ecom_sales_fact', 'ecom_dim_time', 'ecom_dim_product',
        'ecom_dim_customer', 'ecom_dim_category', 'ecom_order_items',
        'ecom_orders', 'ecom_products', 'ecom_users',
    ]
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE TABLE {', '.join(tables)} RESTART IDENTITY CASCADE"))

def normalize_columns(df, log_func=print):
    """
    Map any dataset's column names to a standard internal schema.
    Supports: Online Retail (.xlsx), Superstore (.csv), train.csv
    Internal schema uses: CustomerID, InvoiceNo, InvoiceDate, StockCode,
                          Description, Quantity, UnitPrice, Amount, Country, Category
    """
    cols = df.columns.tolist()

    # Build a lowercase-to-actual map for flexible matching
    col_map = {c.lower().replace(' ', '').replace('-', '').replace('_', ''): c for c in cols}

    rename = {}

    # CustomerID
    for k in ['customerid', 'customerno', 'custid']:
        if k in col_map and 'CustomerID' not in df.columns:
            rename[col_map[k]] = 'CustomerID'
            break

    # InvoiceNo / Order ID
    for k in ['invoiceno', 'orderid', 'order id', 'transactionid']:
        if k in col_map and 'InvoiceNo' not in df.columns:
            rename[col_map[k]] = 'InvoiceNo'
            break

    # InvoiceDate / Order Date
    for k in ['invoicedate', 'orderdate', 'date', 'transactiondate', 'shipdate']:
        if k in col_map and 'InvoiceDate' not in df.columns:
            rename[col_map[k]] = 'InvoiceDate'
            break

    # StockCode / Product ID
    for k in ['stockcode', 'productid', 'itemcode', 'sku']:
        if k in col_map and 'StockCode' not in df.columns:
            rename[col_map[k]] = 'StockCode'
            break

    # Description / Product Name
    for k in ['description', 'productname', 'itemname', 'name', 'subCategory']:
        if k in col_map and 'Description' not in df.columns:
            rename[col_map[k]] = 'Description'
            break

    # Quantity
    for k in ['quantity', 'qty', 'units', 'orderquantity']:
        if k in col_map and 'Quantity' not in df.columns:
            rename[col_map[k]] = 'Quantity'
            break

    # UnitPrice / Sales (for datasets where there is already a total sales column)
    has_unit_price = 'unitprice' in col_map
    has_sales = 'sales' in col_map
    if has_unit_price and 'UnitPrice' not in df.columns:
        rename[col_map['unitprice']] = 'UnitPrice'
    elif has_sales and 'UnitPrice' not in df.columns:
        # Sales column is a per-row total, we'll set UnitPrice = Sales / Quantity later
        rename[col_map['sales']] = '_SalesTotal'

    # Country / Region
    for k in ['country', 'region', 'state', 'city']:
        if k in col_map and 'Country' not in df.columns:
            rename[col_map[k]] = 'Country'
            break

    # Category
    for k in ['category', 'productcategory', 'type']:
        if k in col_map and 'Category' not in df.columns:
            rename[col_map[k]] = 'Category'
            break

    df = df.rename(columns=rename)
    log_func(f"  Column mapping applied: {rename if rename else 'none needed'}")

    # --- AI FALLBACK MAPPING ---
    required_cols = ['CustomerID', 'InvoiceNo', 'InvoiceDate', 'StockCode', 'Description', 'Quantity', 'UnitPrice', 'Country', 'Category']
    missing = [c for c in required_cols if c not in df.columns]
    unmapped_cols = [c for c in df.columns if c not in required_cols and c != '_SalesTotal']
    
    if missing and unmapped_cols and groq_client:
        log_func(f"  AI fallback: attempting to map {missing} from unknown columns: {unmapped_cols}")
        prompt = f"""You are an automated ETL data mapper.
The following required columns are missing: {missing}
The dataset has the following unknown columns: {unmapped_cols}

Map the missing required columns to the most logical unknown columns.
Return ONLY a valid JSON object where keys are the unknown column names and values are the required column names.
Example: {{"client_number": "CustomerID", "purchased_on": "InvoiceDate"}}
If an unknown column does not logically map to a missing required column, do not include it. No markdown."""
        try:
            completion = groq_client.chat.completions.create(
                model="openai/gpt-oss-20b",
                messages=[{"role": "user", "content": prompt}]
            )
            ai_res = completion.choices[0].message.content.strip()
            
            import re
            match = re.search(r'\{.*\}', ai_res, re.DOTALL)
            if match:
                ai_mapping = json.loads(match.group(0))
            else:
                ai_mapping = json.loads(ai_res)
            # Filter mapping to ensure valid names are used
            clean_mapping = {k: v for k, v in ai_mapping.items() if k in unmapped_cols and v in missing}
            if clean_mapping:
                df = df.rename(columns=clean_mapping)
                log_func(f"  AI Column Mapping Applied: {clean_mapping}")
        except Exception as e:
            log_func(f"  AI mapping failed: {e}")
            log_func(f"  AI Response was: {repr(ai_res)}")
    # If only SalesTotal was available, back-calculate UnitPrice
    if '_SalesTotal' in df.columns and 'UnitPrice' not in df.columns:
        # If no Quantity column exists, default to 1 per row (sales-level datasets)
        if 'Quantity' not in df.columns:
            df['Quantity'] = 1
        df['UnitPrice'] = df['_SalesTotal'] / df['Quantity'].replace(0, 1)
        df = df.drop(columns=['_SalesTotal'])

    # Ensure StockCode exists (use row index if not mappable)
    if 'StockCode' not in df.columns:
        df['StockCode'] = 'ITEM-' + df.index.astype(str)

    # Ensure Description exists
    if 'Description' not in df.columns:
        df['Description'] = 'Unknown Product'

    # Ensure Country exists
    if 'Country' not in df.columns:
        df['Country'] = 'Unknown'

    return df


def load_and_clean_data(file_path, log_func=print):
    log_func("Loading dataset...")
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path, encoding='ISO-8859-1')
    else:
        df = pd.read_excel(file_path)
    log_func(f"Original shape: {df.shape}")

    # Normalize all columns to the internal schema first
    df = normalize_columns(df, log_func)

    # 1. Remove Null Values in CustomerID
    if 'CustomerID' in df.columns:
        df = df.dropna(subset=['CustomerID'])
    else:
        print("  WARNING: No CustomerID column found; skipping null-drop.")

    # 2. Remove Negative / Zero Quantities
    if 'Quantity' in df.columns:
        df['Quantity'] = pd.to_numeric(df['Quantity'], errors='coerce').fillna(0)
        df = df[df['Quantity'] > 0]

    # 3. Handle Date Format
    if 'InvoiceDate' in df.columns:
        df['InvoiceDate'] = pd.to_datetime(df['InvoiceDate'], errors='coerce')
        df = df.dropna(subset=['InvoiceDate'])
    else:
        df['InvoiceDate'] = pd.Timestamp.now()

    # 4. Ensure numeric UnitPrice
    if 'UnitPrice' in df.columns:
        df['UnitPrice'] = pd.to_numeric(df['UnitPrice'], errors='coerce').fillna(0)

    # 4b. Ensure Quantity exists (fallback 1)
    if 'Quantity' not in df.columns:
        df['Quantity'] = 1

    # 5. Derive Category from Description if not already set
    if 'Category' not in df.columns or df['Category'].isna().all():
        df['Category'] = 'General'
        if 'Description' in df.columns:
            df.loc[df['Description'].str.contains('BAG', case=False, na=False), 'Category'] = 'Bags'
            df.loc[df['Description'].str.contains('MUG', case=False, na=False), 'Category'] = 'Mugs'
            df.loc[df['Description'].str.contains('HEART', case=False, na=False), 'Category'] = 'Decoration'
            df.loc[df['Description'].str.contains('GIFT|GIFT', case=False, na=False), 'Category'] = 'Gift'
    else:
        df['Category'] = df['Category'].fillna('General')

    # 6. Convert price to INR if the values are small (likely GBP/USD, assume < 200 per unit = foreign currency)
    # Currency conversion removed to keep exact figures as requested.

    # 7. Compute Amount
    if 'UnitPrice' in df.columns and 'Quantity' in df.columns:
        df['Amount'] = df['Quantity'] * df['UnitPrice']
    else:
        df['Amount'] = 0

    print(f"Cleaned shape: {df.shape}")
    return df

def populate_oltp(df, engine):
    print("Populating OLTP Tables...")
    
    # Extract Users
    users_df = df[['CustomerID', 'Country']].drop_duplicates(subset=['CustomerID']).copy()
    users_df.columns = ['user_id', 'country']
    users_df['user_id'] = users_df['user_id'].astype(str).str.strip()
    users_df['name'] = 'User ' + users_df['user_id']
    users_df['email'] = 'user' + users_df['user_id'].str.replace('[^a-zA-Z0-9]', '', regex=True) + '@example.com'
    users_df.to_sql('ecom_users', engine, if_exists='append', index=False, method=insert_do_nothing)
    
    # Extract Products
    products_df = df[['StockCode', 'Description', 'Category', 'UnitPrice']].drop_duplicates(subset=['StockCode']).copy()
    products_df = products_df.groupby('StockCode').first().reset_index()
    products_df.columns = ['product_id', 'name', 'category', 'price']
    products_df['product_id'] = products_df['product_id'].astype(str).str.strip()
    products_df.to_sql('ecom_products', engine, if_exists='append', index=False, method=insert_do_nothing)
    
    # Extract Orders
    orders_df = df[['InvoiceNo', 'CustomerID', 'InvoiceDate']].drop_duplicates(subset=['InvoiceNo']).copy()
    orders_df.columns = ['order_id', 'user_id', 'order_date']
    orders_df['order_id'] = orders_df['order_id'].astype(str).str.strip()
    orders_df['user_id'] = orders_df['user_id'].astype(str).str.strip()
    orders_df.to_sql('ecom_orders', engine, if_exists='append', index=False, method=insert_do_nothing)
    
    # Extract Order Items
    order_items_df = df[['InvoiceNo', 'StockCode', 'Quantity', 'Amount']].copy()
    order_items_df.columns = ['order_id', 'product_id', 'quantity', 'amount']
    order_items_df['order_id'] = order_items_df['order_id'].astype(str).str.strip()
    order_items_df['product_id'] = order_items_df['product_id'].astype(str).str.strip()
    order_items_df.to_sql('ecom_order_items', engine, if_exists='append', index=False, method=insert_do_nothing)
    print("OLTP Tables populated.")

def populate_dw(df, engine):
    print("Populating Data Warehouse Tables...")
    
    # Categories
    categories = df[['Category']].drop_duplicates().copy()
    categories.columns = ['category_name']
    categories.to_sql('ecom_dim_category', engine, if_exists='append', index=False, method=insert_do_nothing)

    # Fetch Category IDs to map to dimension product
    category_map = pd.read_sql("SELECT category_id, category_name FROM ecom_dim_category", engine)
    category_dict = dict(zip(category_map['category_name'], category_map['category_id']))

    # Dim Customer
    dim_cust = df[['CustomerID', 'Country']].drop_duplicates(subset=['CustomerID']).copy()
    dim_cust.columns = ['user_id', 'country']
    dim_cust['user_id'] = dim_cust['user_id'].astype(str).str.strip()
    dim_cust['name'] = 'User ' + dim_cust['user_id']
    dim_cust.to_sql('ecom_dim_customer', engine, if_exists='append', index=False, method=insert_do_nothing)

    # Dim Product
    dim_prod = df[['StockCode', 'Description', 'Category', 'UnitPrice']].drop_duplicates(subset=['StockCode']).copy()
    dim_prod = dim_prod.groupby('StockCode').first().reset_index()
    dim_prod['category_id'] = dim_prod['Category'].map(category_dict)
    dim_prod = dim_prod[['StockCode', 'Description', 'category_id', 'UnitPrice']]
    dim_prod.columns = ['product_id', 'name', 'category_id', 'price']
    dim_prod['product_id'] = dim_prod['product_id'].astype(str)
    dim_prod.to_sql('ecom_dim_product', engine, if_exists='append', index=False, method=insert_do_nothing)

    # Dim Time
    time_df = df[['InvoiceDate']].drop_duplicates().copy()
    time_df['date_id'] = time_df['InvoiceDate'].dt.strftime('%Y%m%d').astype(int)
    time_df['full_date'] = time_df['InvoiceDate'].dt.date
    time_df['day'] = time_df['InvoiceDate'].dt.day
    time_df['month'] = time_df['InvoiceDate'].dt.month
    time_df['year'] = time_df['InvoiceDate'].dt.year
    time_df['quarter'] = time_df['InvoiceDate'].dt.quarter
    time_df['day_of_week'] = time_df['InvoiceDate'].dt.dayofweek
    time_df = time_df.drop('InvoiceDate', axis=1).drop_duplicates(subset=['date_id'])
    time_df.to_sql('ecom_dim_time', engine, if_exists='append', index=False, method=insert_do_nothing)

    # Fact Table
    fact_df = df[['InvoiceNo', 'StockCode', 'CustomerID', 'InvoiceDate', 'Quantity', 'Amount']].copy()
    fact_df['date_id'] = fact_df['InvoiceDate'].dt.strftime('%Y%m%d').astype(int)
    fact_df['order_id'] = fact_df['InvoiceNo'].astype(str).str.strip()
    fact_df['product_id'] = fact_df['StockCode'].astype(str).str.strip()
    fact_df['user_id'] = fact_df['CustomerID'].astype(str).str.strip()
    
    fact_df = fact_df[['order_id', 'product_id', 'user_id', 'date_id', 'Quantity', 'Amount']]
    fact_df.columns = ['order_id', 'product_id', 'user_id', 'date_id', 'quantity', 'amount']
    fact_df.to_sql('ecom_sales_fact', engine, if_exists='append', index=False, method=insert_do_nothing)
    
    print("Data Warehouse populated.")

if __name__ == '__main__':
    file_path = '../dataset/Online Retail.xlsx'
    df = load_and_clean_data(file_path)
    engine = get_engine()
    
    try:
        populate_oltp(df, engine)
        populate_dw(df, engine)
        print("ETL Process Complete!")
    except Exception as e:
        print("An error occurred during DB load. Note: Ensure tables are created first using the SQL scripts.")
        print(str(e))
