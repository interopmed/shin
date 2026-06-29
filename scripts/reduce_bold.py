import os

css_path = r"f:\Web Server\GitHub\interopmed-development-environment\shin\frontend\app\styles\pages\settings.css"

def main():
    if not os.path.exists(css_path):
        print(f"Error: {css_path} not found.")
        return
        
    with open(css_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Replace 900 with 600 (semi-bold) and 800 with 500 (medium)
    updated = content.replace("font-weight: 900;", "font-weight: 600;")
    updated = updated.replace("font-weight: 800;", "font-weight: 500;")
    
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(updated)
        
    print("Successfully reduced font weights in settings.css")

if __name__ == "__main__":
    main()
