from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn

from models import AllocationRequest, GoalRequest, BehaviorRequest
from services.allocation_engine import AllocationEngine
from services.behavior_analyzer import BehaviorAnalyzer
from services.goal_predictor import GoalPredictor

app = FastAPI(title="WealthIntel ML Engine", version="1.0.0")

allocation_engine = AllocationEngine()
behavior_analyzer = BehaviorAnalyzer()
goal_predictor = GoalPredictor()

@app.get("/")
def health_check():
    return {"status": "ML Engine is running"}

@app.post("/predict/allocation")
def predict_allocation(request: AllocationRequest):
    """
    Predict optimal split between spending, savings, and investments.
    """
    try:
        allocation = allocation_engine.predict(request)
        return {"success": True, "data": allocation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/behavior")
def analyze_behavior(request: BehaviorRequest):
    """
    Analyze spending behavior, detect anomalies and generate insights.
    """
    try:
        insights = behavior_analyzer.analyze(request)
        return {"success": True, "data": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/goal-success")
def predict_goal_success(request: GoalRequest):
    """
    Predict probability of achieving a goal and recommend timelines.
    """
    try:
        prediction = goal_predictor.predict(request)
        return {"success": True, "data": prediction}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
