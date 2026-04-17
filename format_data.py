import json

def main():
    try:
        with open('calibrated_data.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        paths_str = json.dumps(data['TERRITORY_PATHS'], indent=2, ensure_ascii=False)
        positions_str = json.dumps(data['POSITIONS'], indent=2, ensure_ascii=False)
        
        output = f"const TERRITORY_PATHS = {paths_str};\n\nconst POSITIONS = {positions_str};"
        
        with open('formatted_config.js', 'w', encoding='utf-8') as f:
            f.write(output)
        print("Successfully created formatted_config.js")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    main()
