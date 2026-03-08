from datetime import datetime
import pytz

# Demand charge info per provider ($/kW over threshold)
DEMAND_CHARGES = {
    "xcel": {"threshold_kw": 6.0, "charge_per_kw": 5.47},
    "core": {"threshold_kw": 5.0, "charge_per_kw": 4.20},
    "united power": {"threshold_kw": 5.0, "charge_per_kw": 3.80},
    "holy cross": {"threshold_kw": 5.0, "charge_per_kw": 4.00},
}

def get_demand_info(provider: str) -> dict:
    """Returns demand charge info for a given provider."""
    return DEMAND_CHARGES.get(provider.lower(), DEMAND_CHARGES["xcel"])

def get_colorado_time():
    """Returns the current time in Mountain Time (Colorado)."""
    mt_tz = pytz.timezone('US/Mountain')
    return datetime.now(mt_tz)

def evaluate_grid_status(provider: str, current_time=None, timezone: str = "America/Denver"):
    """
    Evaluates the grid status based on the provider and the user's local time.
    - timezone: IANA timezone string from the user's device (e.g. 'America/Denver').
    - current_time: interpreted in that timezone; if None, uses server now in that timezone.
    """
    try:
        local_tz = pytz.timezone(timezone)
    except pytz.exceptions.UnknownTimeZoneError:
        local_tz = pytz.timezone("America/Denver")

    if current_time is None:
        current_time = datetime.now(local_tz)
    else:
        if hasattr(current_time, 'tzinfo') and current_time.tzinfo is not None:
            current_time = current_time.astimezone(local_tz)
        else:
            # Naive datetime: treat as already in the device timezone
            current_time = local_tz.localize(current_time)

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
        # United Power Peak: 5 PM - 9 PM
        if not is_weekend and 17 <= hour < 21:
            status = "Red"
            rate = 0.26

    elif provider.lower() == "holy cross":
        # Holy Cross Energy Peak: 4 PM - 8 PM Weekdays
        if not is_weekend and 16 <= hour < 20:
            status = "Red"
            rate = 0.24
        elif not is_weekend and (13 <= hour < 16):
            status = "Yellow"
            rate = 0.14

    # Note: On weekends, usually it's always Green (Off-Peak) for most residential TOU plans in CO.
    d = get_demand_info(provider)
    return {
        "status": status,
        "rate": rate,
        "provider": provider,
        "timestamp": current_time.isoformat(),
        "demand_charge_per_kw": d["charge_per_kw"],
        "demand_threshold_kw": d["threshold_kw"],
    }
