from pydantic import BaseModel
from typing import List, Dict, Optional

class TransactionItem(BaseModel):
    amount: float
    category: str
    date: str
    is_expense: bool

class AllocationRequest(BaseModel):
    monthly_income: float
    current_savings: float
    debt_ratio: float
    risk_profile: str  # low, medium, high
    recent_transactions: List[TransactionItem]

class BehaviorRequest(BaseModel):
    transactions: List[TransactionItem]
    monthly_income: float

class GoalRequest(BaseModel):
    target_amount: float
    current_saved: float
    timeline_months: int
    monthly_income: float
    monthly_expenses: float
    risk_profile: str
