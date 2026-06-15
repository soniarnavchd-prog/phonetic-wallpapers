import requests
from PIL import Image
from io import BytesIO
import numpy as np
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Wallpaper

def calculate_true_black_percentage(image_url: str) -> float:
    """
    Calculate percentage of true black (#000000) pixels in an image.
    Returns float between 0 and 100.
    """
    try:
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        img = Image.open(BytesIO(response.content))
        
        # Convert to RGB if necessary
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Convert to numpy array
        arr = np.array(img)
        
        # Count true black pixels (all channels = 0)
        true_black = np.all(arr == [0, 0, 0], axis=2)
        total_pixels = arr.shape[0] * arr.shape[1]
        black_pixels = np.sum(true_black)
        
        percentage = (black_pixels / total_pixels) * 100
        return round(percentage, 1)
        
    except Exception as e:
        print(f"Error analyzing {image_url}: {e}")
        return 0.0

def analyze_all_amoled():
    """Analyze all AMOLED wallpapers and update their true_black_pct."""
    db = SessionLocal()
    try:
        # Get all AMOLED wallpapers without true_black_pct
        wallpapers = db.query(Wallpaper).filter(
            Wallpaper.category.ilike("AMOLED"),
            Wallpaper.true_black_pct.is_(None)
        ).all()
        
        print(f"Found {len(wallpapers)} AMOLED wallpapers to analyze")
        
        for wallpaper in wallpapers:
            print(f"Analyzing: {wallpaper.title}...", end=" ")
            pct = calculate_true_black_percentage(wallpaper.image_url)
            wallpaper.true_black_pct = pct
            db.commit()
            print(f"{pct}% True Black")
            
        print("Analysis complete!")
        
    finally:
        db.close()

def analyze_wallpaper_by_id(wallpaper_id: int):
    """Analyze a specific wallpaper."""
    db = SessionLocal()
    try:
        wallpaper = db.query(Wallpaper).filter(Wallpaper.id == wallpaper_id).first()
        if not wallpaper:
            print(f"Wallpaper {wallpaper_id} not found")
            return
            
        pct = calculate_true_black_percentage(wallpaper.image_url)
        wallpaper.true_black_pct = pct
        db.commit()
        print(f"{wallpaper.title}: {pct}% True Black")
        
    finally:
        db.close()

if __name__ == "__main__":
    analyze_all_amoled()