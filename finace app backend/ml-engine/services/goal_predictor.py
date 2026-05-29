import xgboost as xgb
import numpy as np
import pandas as pd
from models import GoalRequest

class GoalPredictor:
    def __init__(self):
        # In a real scenario, this would be a loaded XGBoost model predicting success probability
        # Here we simulate the logic a trained model would learn.
        self.dummy_model_ready = True
        
    def predict(self, data: GoalRequest) -> dict:
        remaining_amount = data.target_amount - data.current_saved
        if remaining_amount <= 0:
            return {
                "probability_percentage": 100.0,
                "monthly_required": 0.0,
                "risk_level": "none",
                "recommendation": "Goal already achieved!"
            }
            
        months = data.timeline_months
        if months <= 0:
            return {"error": "Timeline must be greater than 0 months."}
            
        # Basic Required Monthly Savings
        monthly_required = remaining_amount / months
        
        # Free Cash Flow
        free_cash_flow = data.monthly_income - data.monthly_expenses
        
        # ML Simulation: Feature Engineering
        # Features: [monthly_required/income ratio, free_cash_flow/monthly_required ratio, timeline length]
        ratio_req_income = monthly_required / data.monthly_income if data.monthly_income > 0 else 1.0
        ratio_fcf_req = free_cash_flow / monthly_required if monthly_required > 0 else 0.0
        
        # Predict Probability
        # If FCF is much higher than required, probability is high.
        # If required is high % of income, probability drops.
        base_prob = 0.5
        if ratio_fcf_req >= 1.5:
            base_prob += 0.4
        elif ratio_fcf_req >= 1.0:
            base_prob += 0.25
        elif ratio_fcf_req >= 0.5:
            base_prob += 0.0
        else:
            base_prob -= 0.3
            
        # Timeline effect: longer timelines have more variance but lower monthly burden
        if months > 36:
            base_prob -= 0.05
            
        # Risk profile effect
        if data.risk_profile.lower() == 'high':
            base_prob -= 0.1 # High risk investments might miss short term goals
            
        prob = max(0.01, min(0.99, base_prob))
        prob_percentage = round(prob * 100, 1)
        
        risk_level = "High" if prob_percentage < 40 else ("Medium" if prob_percentage < 75 else "Low")
        
        recommendation = ""
        if prob_percentage < 50:
            recommendation = f"You need ₹{round(monthly_required, 2)}/month, but your free cash flow is only ₹{round(free_cash_flow, 2)}. Consider extending the timeline."
        elif prob_percentage < 80:
            recommendation = "You are on track but margin of error is small. Try to reduce monthly expenses."
        else:
            recommendation = "High probability of success! Consider investing the required amount in low-risk mutual funds."

        return {
            "probability_percentage": prob_percentage,
            "monthly_required": round(monthly_required, 2),
            "free_cash_flow": round(free_cash_flow, 2),
            "risk_level": risk_level,
            "projected_completion_months": months if prob_percentage > 50 else int(months * (1 + (1 - prob))),
            "recommendation": recommendation
        }
