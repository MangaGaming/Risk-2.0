import xml.etree.ElementTree as ET
import re
import json
import os

SVG_PATH = r'c:\Users\Manga\OneDrive\Bureau\Projects\Risk\risk_board_real.svg'
OFFSET_X = -167.99651
OFFSET_Y = -118.55507

MAPPING = {
    "alaska": "Alaska",
    "northwest_territory": "Nord-Ouest",
    "greenland": "Groenland",
    "alberta": "Alberta",
    "ontario": "Ontario",
    "quebec": "Québec",
    "western_united_states": "États-Unis de l'Ouest",
    "eastern_united_states": "États-Unis de l'Est",
    "central_america": "Amérique Centrale",
    "venezuela": "Venezuela",
    "peru": "Pérou",
    "brazil": "Brésil",
    "argentina": "Argentine",
    "iceland": "Islande",
    "great_britain": "Grande-Bretagne",
    "scandinavia": "Scandinavie",
    "ukraine": "Ukraine",
    "northern_europe": "Europe du Nord",
    "southern_europe": "Europe du Sud",
    "western_europe": "Europe de l'Ouest",
    "north_africa": "Afrique du Nord",
    "egypt": "Égypte",
    "east_africa": "Afrique de l'Est",
    "congo": "Afrique Centrale",
    "south_africa": "Afrique du Sud",
    "madagascar": "Madagascar",
    "ural": "Oural",
    "afghanistan": "Afghanistan",
    "middle_east": "Moyen-Orient",
    "india": "Inde",
    "siam": "Siam",
    "china": "Chine",
    "mongolia": "Mongolie",
    "irkutsk": "Irkoutsk",
    "yakursk": "Yakoutsk",
    "kamchatka": "Kamchatka",
    "siberia": "Sibérie",
    "japan": "Japon",
    "indonesia": "Indonésie",
    "new_guinea": "Nouvelle-Guinée",
    "western_australia": "Australie de l'Ouest",
    "eastern_australia": "Australie de l'Est"
}

def calibrate_path(d):
    # Regex to find all pairs of numbers in the path string
    # We want to shift only absolute coordinates. 
    # This is a bit complex, but if the SVG is mostly absolute, we can try to shift all numbers.
    # Let's try splitting by commands.
    
    def shift_match(match):
        x = float(match.group(1)) + OFFSET_X
        y = float(match.group(2)) + OFFSET_Y
        return f"{round(x, 3)},{round(y, 3)}"

    # Identify pairs of floats separated by comma or space
    # Example: 254.5,242.25
    # We use a pattern that matches X and Y.
    pattern = r'(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)'
    
    # However, some numbers might be single values (like 'h 10' or 'v 5').
    # But for simplicity in this Risk map (which is likely mostly L/C/M), 
    # we'll look for comma-separated pairs.
    processed_d = re.sub(pattern, shift_match, d)
    return processed_d

def get_center(d):
    pattern = r'(-?\d+\.?\d*)\s*[,\s]\s*(-?\d+\.?\d*)'
    matches = re.findall(pattern, d)
    if not matches:
        return [0, 0]
    
    # Calculate bounding box
    min_x = min_y = float('inf')
    max_x = max_y = float('-inf')
    
    for x_str, y_str in matches:
        x, y = float(x_str) + OFFSET_X, float(y_str) + OFFSET_Y
        min_x = min(min_x, x)
        max_x = max(max_x, x)
        min_y = min(min_y, y)
        max_y = max(max_y, y)
    
    return [round((min_x + max_x) / 2, 1), round((min_y + max_y) / 2, 1)]

def run():
    ns = {'svg': 'http://www.w3.org/2000/svg'}
    tree = ET.parse(SVG_PATH)
    root = tree.getroot()
    
    calibrated_paths = {}
    calibrated_positions = {}
    
    for svg_id, fr_name in MAPPING.items():
        path = root.find(f'.//svg:path[@id="{svg_id}"]', ns)
        if path is not None:
            d = path.attrib.get('d')
            calibrated_paths[fr_name] = calibrate_path(d)
            calibrated_positions[fr_name] = get_center(d)
        else:
            print(f"WARNING: {svg_id} not found in SVG")
            
    # Save to a temporary file
    results = {
        "TERRITORY_PATHS": calibrated_paths,
        "POSITIONS": calibrated_positions
    }
    
    with open('calibrated_data.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print("Calibration complete. Data saved to calibrated_data.json")

if __name__ == "__main__":
    run()
