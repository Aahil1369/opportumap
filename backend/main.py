from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np

app = FastAPI(title="OpportuMap ML API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Salary prediction input ---
class SalaryInput(BaseModel):
    title: str
    country: str
    years_experience: int = 2
    remote: bool = False

# Placeholder model — replace with trained XGBoost later
COUNTRY_BASE = {"us": 120000, "gb": 80000, "ca": 95000, "au": 90000, "de": 70000, "in": 20000, "sg": 85000}
TITLE_MULTIPLIER = {"engineer": 1.1, "senior": 1.3, "ml": 1.2, "ai": 1.25, "manager": 1.4, "intern": 0.3, "junior": 0.7}

@app.post("/predict/salary")
def predict_salary(data: SalaryInput):
    base = COUNTRY_BASE.get(data.country.lower(), 80000)
    multiplier = 1.0
    for keyword, factor in TITLE_MULTIPLIER.items():
        if keyword in data.title.lower():
            multiplier = max(multiplier, factor)
    exp_bonus = data.years_experience * 0.03
    remote_bonus = 0.05 if data.remote else 0
    predicted = int(base * multiplier * (1 + exp_bonus + remote_bonus))
    return {
        "predicted_salary": predicted,
        "currency": "USD" if data.country == "us" else "local",
        "confidence": "placeholder — train XGBoost model for real predictions",
    }

@app.get("/health")
def health():
    return {"status": "ok"}
