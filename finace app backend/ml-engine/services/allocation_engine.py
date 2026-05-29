import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from models import AllocationRequest

class AllocationEngine:
    def __init__(self):
        # In a real scenario, we would load a pre-trained model here.
        # For now, we build a sophisticated rule-based + basic ML scoring system
        self.scaler = MinMaxScaler()
        
    def predict(self, data: AllocationRequest) -> dict:
        income = data.monthly_income
        if income <= 0:
            return {"error": "Invalid income"}
            
        # Basic baseline: 50/30/20 rule
        essential_pct = 0.50
        lifestyle_pct = 0.30
        savings_investments_pct = 0.20
        
        # Adjust based on risk profile
        risk_modifier = {"low": 0.8, "medium": 1.0, "high": 1.2}.get(data.risk_profile.lower(), 1.0)
        
        # Adjust based on debt
        if data.debt_ratio > 0.4:
            # High debt: shift lifestyle to savings/debt payment
            lifestyle_pct -= 0.10
            savings_investments_pct += 0.10
            
        # Calculate dynamic amounts
        essential_amt = income * essential_pct
        lifestyle_amt = income * lifestyle_pct
        savings_total = income * savings_investments_pct
        
        # Split savings_total into Emergency, Savings, Investments, Buffer
        emergency_pct = 0.2 if data.current_savings < (income * 3) else 0.05
        investment_pct = 0.6 * risk_modifier
        
        # Normalize
        total_sub_pct = emergency_pct + investment_pct + 0.15 # 0.15 for buffer/general savings
        
        emergency_amt = savings_total * (emergency_pct / total_sub_pct)
        investment_amt = savings_total * (investment_pct / total_sub_pct)
        buffer_amt = savings_total * (0.05 / total_sub_pct)
        savings_amt = savings_total - (emergency_amt + investment_amt + buffer_amt)
        
        return {
            "income": income,
            "allocations": {
                "essential_expenses": round(essential_amt, 2),
                "lifestyle_expenses": round(lifestyle_amt, 2),
                "savings": round(savings_amt, 2),
                "investments": round(investment_amt, 2),
                "emergency_fund": round(emergency_amt, 2),
                "buffer": round(buffer_amt, 2)
            },
            "health_score": self._calculate_health_score(data),
            "recommendation": "Your debt ratio requires a higher savings allocation." if data.debt_ratio > 0.4 else "Balanced allocation based on your risk profile."
        }
        
    def _calculate_health_score(self, data: AllocationRequest) -> int:
        score = 100
        if data.debt_ratio > 0.5:
            score -= 30
        elif data.debt_ratio > 0.3:
            score -= 15
            
        if data.current_savings < data.monthly_income:
            score -= 20
        elif data.current_savings >= data.monthly_income * 6:
            score += 10
            
        return max(0, min(100, score))
