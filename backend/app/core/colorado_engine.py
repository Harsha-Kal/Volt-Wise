from datetime import datetime
import pytz

def get_colorado_time():
    """Returns the current time in Mountain Time (Colorado)."""
    mt_tz = pytz.timezone('US/Mountain')
    return datetime.now(mt_tz)

def evaluate_grid_status(provider: str, current_time=None):
    """
    Evaluates the grid status based on the provider and current Mountain Time.
    Returns a dict with 'status' (Green, Yellow, Red) and 'rate' (cost per kWh in cents or relative).
    """
    if current_time is None:
        current_time = get_colorado_time()

    hour = current_time.hour
    is_weekend = current_time.weekday() >= 5

    # Default baseline
    status = "Green"
    rate = 0.08  # Off-peak approx 8 cents

    if provider.lower() == "xcel":
        # Xcel Peak: 3 PM - 7 PM Summer, but spec says 5 PM - 9 PM for generic 2026? Let's use 5-9 PM Weekdays.
        if not is_weekend and 17 <= hour < 21:
            status = "Red"
            rate = 0.28 # Peak rate
        elif not is_weekend and (13 <= hour < 17 or hour == 22): # Optional shoulder
            status = "Yellow"
            rate = 0.18

    elif provider.lower() == "core":
        # CORE Peak: 4 PM - 8 PM
        if not is_weekend and 16 <= hour < 20:
            status = "Red"
            rate = 0.25
        elif not is_weekend and (14 <= hour < 16):
            status = "Yellow"
            rate = 0.15

    elif provider.lower() == "united power":
        # United Power Peak: 4 PM - 8 PM usually or 5-9 PM
        if not is_weekend and 17 <= hour < 21:
            status = "Red"
            rate = 0.26
            
    # Note: On weekends, usually it's always Green (Off-Peak) for most residential TOU plans in CO.
    
    return {
        "status": status,
        "rate": rate,
        "provider": provider,
        "timestamp": current_time.isoformat()
    }
