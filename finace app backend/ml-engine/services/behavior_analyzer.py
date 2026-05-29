import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from models import BehaviorRequest

class BehaviorAnalyzer:
    def __init__(self):
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.clusterer = KMeans(n_clusters=3, random_state=42)
        
    def analyze(self, data: BehaviorRequest) -> dict:
        if not data.transactions:
            return {"error": "No transactions provided for analysis."}
            
        df = pd.DataFrame([t.dict() for t in data.transactions])
        
        # Convert dates to datetime
        df['date'] = pd.to_datetime(df['date'])
        df['day_of_week'] = df['date'].dt.dayofweek
        df['is_weekend'] = df['day_of_week'] >= 5
        
        expenses = df[df['is_expense'] == True].copy()
        
        insights = []
        if not expenses.empty:
            # 1. Weekend Spending Analysis
            weekend_spend = expenses[expenses['is_weekend']]['amount'].sum()
            total_spend = expenses['amount'].sum()
            weekend_pct = (weekend_spend / total_spend) * 100 if total_spend > 0 else 0
            
            if weekend_pct > 40:
                insights.append(f"You overspend {round(weekend_pct, 1)}% on weekends. Consider planning weekend budgets.")
                
            # 2. Anomaly Detection (Spikes)
            # Reshape amount for IsolationForest
            X = expenses['amount'].values.reshape(-1, 1)
            if len(X) >= 5: # Need enough data points
                preds = self.anomaly_detector.fit_predict(X)
                anomalies = expenses[preds == -1]
                if not anomalies.empty:
                    max_anomaly = anomalies.loc[anomalies['amount'].idxmax()]
                    insights.append(f"Detected a spending spike of ₹{max_anomaly['amount']} in {max_anomaly['category']}.")
            
            # 3. Category Volatility
            cat_grouped = expenses.groupby('category')['amount'].std().fillna(0)
            volatile_cat = cat_grouped.idxmax() if not cat_grouped.empty and cat_grouped.max() > 0 else None
            if volatile_cat:
                insights.append(f"Your spending in {volatile_cat} is highly volatile. Setting a fixed limit might help.")
                
        else:
            insights.append("Not enough expense data to generate behavioral insights.")
            
        return {
            "insights": insights,
            "total_analyzed_transactions": len(df),
            "volatility_index": float(expenses['amount'].std()) if not expenses.empty and len(expenses) > 1 else 0.0
        }
