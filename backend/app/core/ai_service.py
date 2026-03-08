import os
from datetime import datetime
from app.core.colorado_engine import evaluate_grid_status

def generate_savings_forecast(logs: list, provider: str = "Xcel") -> str:
    """
    Analyzes the user's recent energy habits and provides a forecast.
    Uses deterministic logic to provide actionable insights about scheduling
    and habits without relying on an external API.
    """
    if not logs:
        return "No recent activity to analyze. Start logging your appliances to get personalized savings tips!"
        
    tips = []
    
    # 1. Check for planned actions during peak hours
    planned_peak = [l for l in logs if l.get("type") == "Planned Action" and l.get("projected_cost", 0) > 0.5]
    if planned_peak:
        worst_schedule = max(planned_peak, key=lambda x: x.get("projected_cost", 0))
        appliance_name = worst_schedule.get("appliance", "device")
        cost = worst_schedule.get("projected_cost", 0)
        # Estimate savings (assuming off-peak is roughly 70% cheaper + no demand charge)
        savings = cost * 0.7 
        tips.append(f"You're scheduling your {appliance_name} during peak hours! Waiting until off-peak would save you roughly ${savings:.2f}.")

    # 2. Check past habits to suggest switching devices
    past_actions = [l for l in logs if l.get("type") == "Past Action"]
    if len(past_actions) >= 2:
        # Get the top two most expensive appliances used recently
        costs_by_appliance = {}
        for action in past_actions:
            name = action.get("appliance", "Unknown")
            costs_by_appliance[name] = costs_by_appliance.get(name, 0) + action.get("cost", 0)
            
        sorted_appliances = sorted(costs_by_appliance.items(), key=lambda x: x[1], reverse=True)
        if len(sorted_appliances) >= 2:
            top1 = sorted_appliances[0][0]
            top2 = sorted_appliances[1][0]
            tips.append(f"Based on your current habits, it would be ideal to switch the usage time of your {top1} and {top2} to off-peak hours to save money and reduce overlapping demand.")
            
    if not tips:
        tips.append("You're doing great! Keep scheduling your heavy appliances during off-peak hours (typically after 8 PM) to maximize your savings.")

    return " ".join(tips)
