import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules

def generate_market_basket(df, min_support=0.03, max_products=200):
    """
    Market Basket Analysis using the Apriori algorithm and association rules mining.

    - Limits item universe to the top `max_products` by volume for memory/compute efficiency.
    - Filters to multi-item baskets (InvoiceNo with >= 2 distinct items).
    - Adaptively adjusts `min_support` if the initial threshold yields no frequent itemsets,
      ensuring meaningful association rules are discovered across various dataset sizes.
    """
    if df is None or df.empty:
        return []

    # Filter to transactions with valid descriptions and positive quantities
    df = df[df['Description'].notna() & (df['Quantity'] > 0)]
    if df.empty:
        return []

    # Limit to top items by total quantity to avoid oversized sparse matrix
    top_products = df.groupby('Description')['Quantity'].sum().nlargest(max_products).index
    df_top = df[df['Description'].isin(top_products)]

    # Pivot to basket: rows = InvoiceNo, cols = Description
    basket = df_top.groupby(['InvoiceNo', 'Description'])['Quantity'].sum().unstack(fill_value=0)
    if basket.empty or basket.shape[1] < 2:
        return []

    # Convert quantities to boolean presence/absence
    basket_sets = basket.map(lambda x: True if x >= 1 else False)

    # Focus on multi-item baskets (orders with at least 2 distinct products)
    basket_sets = basket_sets[basket_sets.sum(axis=1) >= 2]
    if len(basket_sets) < 2:
        return []

    # Candidates for support threshold, starting from requested down to 0.001
    requested_sup = float(min_support)
    candidate_supports = [requested_sup]
    for alt in [requested_sup * 0.7, 0.025, 0.02, 0.015, 0.01, 0.007, 0.005, 0.003, 0.002, 0.001]:
        if alt < requested_sup and alt not in candidate_supports:
            candidate_supports.append(round(alt, 4))

    top_rules = None
    for sup in candidate_supports:
        try:
            frequent_itemsets = apriori(basket_sets, min_support=sup, use_colnames=True)
            if frequent_itemsets.empty:
                continue

            rules = association_rules(frequent_itemsets, metric="lift", min_threshold=1.05)
            if not rules.empty:
                top_rules = rules.sort_values(by=['lift', 'confidence'], ascending=[False, False]).head(15)
                break
        except Exception:
            continue

    if top_rules is None or top_rules.empty:
        return []

    results = []
    for _, row in top_rules.iterrows():
        ant = ' + '.join(str(x).strip() for x in row['antecedents'])
        con = ' + '.join(str(x).strip() for x in row['consequents'])
        results.append({
            'rule': f"{ant} -> {con}",
            'support': round(float(row['support']), 4),
            'confidence': round(float(row['confidence']), 4),
            'lift': round(float(row['lift']), 4)
        })

    return results
