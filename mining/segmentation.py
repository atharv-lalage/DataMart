import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import json

def generate_segmentation(df, n_clusters=3):
    """
    Simulates K-Means customer segmentation based on RFM (Recency, Frequency, Monetary value).
    """
    # Create RFM Features
    # Recency (days since last purchase relative to max date)
    max_date = df['InvoiceDate'].max()
    rfm = df.groupby('CustomerID').agg({
        'InvoiceDate': lambda x: (max_date - x.max()).days,
        'InvoiceNo': 'nunique',
        'Amount': 'sum'
    })
    rfm.rename(columns={'InvoiceDate': 'Recency', 'InvoiceNo': 'Frequency', 'Amount': 'Monetary'}, inplace=True)
    
    # Filter out outliers or zero/negative monetary for better clustering
    rfm = rfm[rfm['Monetary'] > 0]
    if rfm.empty:
        return []

    # A small uploaded dataset may have fewer customers than the requested
    # cluster count. Use the largest valid count instead of returning a 500.
    cluster_count = min(max(1, int(n_clusters)), len(rfm))
    if cluster_count == 1:
        return [{
            'Segment': 'Single Customer Group',
            'Avg_Recency': round(float(rfm['Recency'].mean()), 2),
            'Avg_Frequency': round(float(rfm['Frequency'].mean()), 2),
            'Avg_Monetary': round(float(rfm['Monetary'].mean()), 2),
            'Customer_Count': int(len(rfm)),
        }]
    
    # Scale Data
    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(rfm)
    
    kmeans = KMeans(n_clusters=cluster_count, random_state=42, n_init=10)
    rfm['Cluster'] = kmeans.fit_predict(rfm_scaled)
    
    # Label Clusters based on Monetary center
    cluster_centers = rfm.groupby('Cluster')['Monetary'].mean().sort_values()
    if cluster_count == 3:
        labels = ['Low Value', 'Mid Value', 'High Value']
    else:
        labels = [f'Segment {index + 1}' for index in range(cluster_count)]
    cluster_mapping = dict(zip(cluster_centers.index, labels))
    rfm['Segment'] = rfm['Cluster'].map(cluster_mapping)
    
    # Prepare result summary
    summary = rfm.groupby('Segment').agg({
        'Recency': 'mean',
        'Frequency': 'mean',
        'Monetary': ['mean', 'count']
    })
    summary.columns = ['Avg_Recency', 'Avg_Frequency', 'Avg_Monetary', 'Customer_Count']
    summary = summary.reset_index()
    
    return summary.to_dict(orient='records')
