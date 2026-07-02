import random
from app.schemas import RoutePoint

def calculate_carbon(vehicle_type: str, distance_km: float, passengers: int = 1):
    # Emissions factors (kg CO2 per km per vehicle)
    factors = {
        "petrol_car": 0.18,
        "diesel_car": 0.20,
        "electric_car": 0.05,
        "motorbike": 0.08,
        "bus": 0.04,
        "train": 0.03
    }
    
    factor = factors.get(vehicle_type, 0.12)
    co2 = (distance_km * factor) / max(passengers, 1)
    
    # 1 tree absorbs ~22kg of CO2 per year, which is ~0.06kg daily
    trees_needed = co2 / 0.06
    
    if co2 < 1.0:
        rating = "Low (Eco-Friendly)"
        tips = [
            "Excellent choice! You are helping protect the atmosphere.",
            "Encourage others to use similar transport options."
        ]
    elif co2 <= 5.0:
        rating = "Moderate"
        tips = [
            "Consider carpooling next time to further reduce emissions.",
            "Can you complete this trip by cycling or walking?"
        ]
    else:
        rating = "High"
        tips = [
            "Your trip generated a significant amount of carbon.",
            "Try switching to public transport like metro or electric buses.",
            "Consider planting trees to offset this footprint."
        ]
        
    return {
        "co2_emitted_kg": round(co2, 2),
        "comparison_trees_absorbed_daily": round(trees_needed, 2),
        "carbon_rating": rating,
        "green_tips": tips
    }

def calculate_green_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float, mode: str = "walking"):
    steps = 5
    clean_points = []
    alt_points = []
    
    lats = [start_lat + (i / steps) * (end_lat - start_lat) for i in range(steps + 1)]
    lngs = [start_lng + (i / steps) * (end_lng - start_lng) for i in range(steps + 1)]
    
    # Clean Route: low AQIs (40 to 80)
    for i in range(steps + 1):
        lat_offset = 0.002 * (1.0 - abs(i - steps/2)/(steps/2)) if 0 < i < steps else 0.0
        aqi = int(45 + 10 * i + random.randint(-5, 5))
        category = "Good" if aqi <= 50 else "Satisfactory"
        
        clean_points.append(RoutePoint(
            lat=lats[i] + lat_offset,
            lng=lngs[i],
            aqi=aqi,
            category=category
        ))
        
    # Alternative Route (Traffic Route): High AQIs (120 to 220)
    for i in range(steps + 1):
        aqi = int(120 + 25 * i - 5 * (i**2) + random.randint(-10, 10))
        if aqi > 200:
            category = "Poor"
        elif aqi > 100:
            category = "Moderate"
        else:
            category = "Satisfactory"
            
        alt_points.append(RoutePoint(
            lat=lats[i],
            lng=lngs[i],
            aqi=aqi,
            category=category
        ))
        
    avg_clean = sum(p.aqi for p in clean_points) / len(clean_points)
    avg_alt = sum(p.aqi for p in alt_points) / len(alt_points)
    
    safety_idx = max(0, 100 - (avg_clean / 300) * 100)
    
    return {
        "route_name": "Green Eco-Route (Cleanest Air)",
        "clean_route_points": clean_points,
        "average_aqi": round(avg_clean, 1),
        "health_safety_index": round(safety_idx, 1),
        "alternative_points": alt_points,
        "alternative_average_aqi": round(avg_alt, 1)
    }
