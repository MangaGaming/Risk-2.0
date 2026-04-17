import re

def extract_object(content, obj_name):
    pattern = rf'const\s+{obj_name}\s*=\s*\{{(.*?)\}};'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(0)
    return None

def main():
    with open('formatted_config.js', 'r', encoding='utf-8') as f:
        formatted = f.read()
    
    new_paths = extract_object(formatted, 'TERRITORY_PATHS')
    new_positions = extract_object(formatted, 'POSITIONS')
    
    if not new_paths or not new_positions:
        print("Error: Could not find constants in formatted_config.js")
        return

    with open('js/config.js', 'r', encoding='utf-8') as f:
        config = f.read()

    # Replace TERRITORY_PATHS
    config = re.sub(r'const\s+TERRITORY_PATHS\s*=\s*\{.*?\};', new_paths, config, flags=re.DOTALL)
    
    # Replace POSITIONS
    config = re.sub(r'const\s+POSITIONS\s*=\s*\{.*?\};', new_positions, config, flags=re.DOTALL)

    with open('js/config.js', 'w', encoding='utf-8') as f:
        f.write(config)
    
    print("Successfully updated js/config.js with calibrated data.")

if __name__ == '__main__':
    main()
