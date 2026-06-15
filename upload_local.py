import os
from database import engine, SessionLocal, Base
from models import Wallpaper
from cloudinary_config import upload_image, get_transformed_url

# Desktop categories — MUST match your actual folder names exactly
DESKTOP_FOLDERS = {
    "abstract": "Abstract",
    "space": "Space",
    "surreal": "Surreal",
    "Minimalist": "Minimal",
    "cyberpunk": "Cyberpunk",
    "nature": "Nature",
    "technology": "Technology",
    "sports": "Sports",
    "music": "Music",
    "cars": "Cars",
    "anime": "Anime",
    "top-rated": "Top Rated",
    "premium": "Premium"
}

# Phone categories — MUST match your actual folder names exactly
PHONE_FOLDERS = {
    "phoneabstract": "phoneabstract",
    "phoneamoled": "phoneamoled",
    "phoneminimal": "phoneminimal",
    "phonescifi": "phonescifi",
    "phonenature": "phonenature",
    "phonetechnology": "phonetechnology",
    "phonesports": "phonesports",
    "phonemusic": "phonemusic",
    "phonecars": "phonecars",
    "phoneanime": "phoneanime",
    "phonetop-rated": "phonetop-rated",
    "phonepremium": "phonepremium",
    "phonespace": "phonespace",
    "phonesurreal": "phonesurreal"
}

ALL_FOLDERS = {**DESKTOP_FOLDERS, **PHONE_FOLDERS}

def upload_folder(folder_path="."):
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created")
    
    db = SessionLocal()
    uploaded = 0
    skipped = 0
    
    for folder_name, category in ALL_FOLDERS.items():
        full_path = os.path.join(folder_path, folder_name)
        
        if not os.path.exists(full_path):
            print(f"⚠ Folder not found: {full_path}")
            continue
            
        files = [f for f in os.listdir(full_path) 
                 if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'))]
        
        print(f"\n📁 {folder_name} ({category}): {len(files)} images")
        
        for filename in files:
            title = os.path.splitext(filename)[0].replace('_', ' ').replace('-', ' ').title()
            public_id = f"wallpapers/{folder_name}/{os.path.splitext(filename)[0].lower()}"
            
            existing = db.query(Wallpaper).filter(Wallpaper.public_id == public_id).first()
            if existing:
                print(f"  ⏭ Skipped (exists): {title}")
                skipped += 1
                continue
            
            file_path = os.path.join(full_path, filename)
            
            try:
                print(f"  ⬆ Uploading: {title}...", end=" ")
                secure_url = upload_image(file_path, public_id=public_id)
                thumbnail = get_transformed_url(public_id, width=600, height=400, crop="fill")
                
                wallpaper = Wallpaper(
                    title=title,
                    category=category,
                    image_url=secure_url,
                    thumbnail_url=thumbnail,
                    public_id=public_id
                )
                db.add(wallpaper)
                uploaded += 1
                print("✓")
            except Exception as e:
                print(f"✗ Failed: {e}")
    
    db.commit()
    db.close()
    print(f"\n{'='*50}")
    print(f"Done! Uploaded: {uploaded}, Skipped: {skipped}")
    print(f"{'='*50}")

if __name__ == "__main__":
    upload_folder()