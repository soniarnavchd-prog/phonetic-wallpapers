import os
from fastapi import FastAPI, Request, Depends, Query, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from database import engine, SessionLocal, Base
from models import Wallpaper, User, Favorite, Collection
from cloudinary_config import upload_image, get_transformed_url

PORT = int(os.getenv("PORT", 8000))

app = FastAPI()

# Static files - mount the static directory
app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

LOCAL_FOLDERS = ["abstract", "space", "surreal", "Minimalist", "cyberpunk", "nature", "technology", "sports", "music", "cars", "anime", "top-rated", "premium"]

SEED_WALLPAPERS = [
    {"title": "Neon Horizon", "category": "Sci-Fi", "image_url": "https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1920&q=80"},
    {"title": "Abstract Flow", "category": "Abstract", "image_url": "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80"},
    {"title": "Deep Space", "category": "AMOLED", "image_url": "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80"},
    {"title": "Minimal White", "category": "Minimal", "image_url": "https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1920&q=80"},
    {"title": "Forest Mist", "category": "Nature", "image_url": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80"},
    {"title": "Cyber Grid", "category": "Sci-Fi", "image_url": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80"},
    {"title": "Ocean Waves", "category": "Abstract", "image_url": "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=80"},
    {"title": "Mountain Peak", "category": "Nature", "image_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80"},
    {"title": "City Lights", "category": "Technology", "image_url": "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80"},
    {"title": "Sports Car", "category": "Cars", "image_url": "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=80"},
]

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Wallpaper).count()
        
        # If the database is empty, force the seed regardless of folders
        if count == 0:
            print("Database is empty. Seeding initial wallpapers...")
            for data in SEED_WALLPAPERS:
                wallpaper = Wallpaper(
                    title=data["title"],
                    category=data["category"],
                    image_url=data["image_url"],
                    thumbnail_url=data["image_url"],
                    public_id=None
                )
                db.add(wallpaper)
            db.commit()
            print(f"Seeded {len(SEED_WALLPAPERS)} wallpapers successfully!")
        else:
            print(f"Database already has {count} wallpapers. Skipping seed.")
            
    except Exception as e:
        print(f"Startup error: {e}")
        db.rollback()
    finally:
        db.close()

# Read HTML template at request time (not import time) to avoid caching issues
def read_html_template():
    try:
        with open("templates/index.html", "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "<html><body><h1>Error: templates/index.html not found</h1></body></html>"
    except Exception as e:
        return f"<html><body><h1>Error reading template: {str(e)}</h1></body></html>"

@app.get("/", response_class=HTMLResponse)
def index():
    html_content = read_html_template()
    return HTMLResponse(content=html_content)

@app.get("/api/wallpapers")
def get_wallpapers(category: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(Wallpaper)
    if category and category != "all":
        slug_map = {
            "scifi": "Sci-Fi", "amoled": "AMOLED", "minimal": "Minimal",
            "abstract": "Abstract", "nature": "Nature", "technology": "Technology",
            "sports": "Sports", "music": "Music", "cars": "Cars", "anime": "Anime",
            "top-rated": "Top Rated", "premium": "Premium",
            "space": "Space", "surreal": "Surreal", "cyberpunk": "Cyberpunk",
            "phoneabstract": "phoneabstract", "phoneamoled": "phoneamoled",
            "phoneminimal": "phoneminimal", "phonescifi": "phonescifi",
            "phonenature": "phonenature", "phonetechnology": "phonetechnology",
            "phonesports": "phonesports", "phonemusic": "phonemusic",
            "phonecars": "phonecars", "phoneanime": "phoneanime",
            "phonetop-rated": "phonetop-rated", "phonepremium": "phonepremium",
            "phonespace": "phonespace", "phonesurreal": "phonesurreal"
        }
        db_cat = slug_map.get(category.lower(), category)
        query = query.filter(Wallpaper.category.ilike(db_cat))

    wallpapers = query.all()
    return JSONResponse(content=[
        {
            "id": w.id,
            "title": w.title,
            "category": w.category,
            "image_url": w.image_url,
            "thumbnail_url": w.thumbnail_url or w.image_url,
            "true_black_pct": w.true_black_pct
        }
        for w in wallpapers
    ])

@app.post("/api/upload")
def upload_wallpaper(
    title: str = Form(...),
    category: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(file.file.read())

    public_id = f"wallpapers/{title.replace(' ', '_').lower()}"
    secure_url = upload_image(temp_path, public_id=public_id)
    thumbnail = get_transformed_url(public_id, width=600, height=400, crop="fill")

    os.remove(temp_path)

    wallpaper = Wallpaper(
        title=title,
        category=category,
        image_url=secure_url,
        thumbnail_url=thumbnail,
        public_id=public_id
    )
    db.add(wallpaper)
    db.commit()
    db.refresh(wallpaper)

    return JSONResponse(content={
        "id": wallpaper.id,
        "title": wallpaper.title,
        "category": wallpaper.category,
        "image_url": wallpaper.image_url,
        "thumbnail_url": wallpaper.thumbnail_url or wallpaper.image_url
    })

# ==================== USER & FAVORITES API ====================

@app.post("/api/users")
def create_user(username: str = Form(...), db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.username == username).first()
    if existing:
        return JSONResponse(content={"id": existing.id, "username": existing.username})

    user = User(username=username)
    db.add(user)
    db.commit()
    db.refresh(user)
    return JSONResponse(content={"id": user.id, "username": user.username})

@app.get("/api/users/{user_id}")
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return JSONResponse(content={"id": user.id, "username": user.username})

@app.post("/api/favorites")
def toggle_favorite(
    user_id: int = Form(...),
    wallpaper_id: int = Form(...),
    collection_name: str = Form(None),
    db: Session = Depends(get_db)
):
    existing = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.wallpaper_id == wallpaper_id
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return JSONResponse(content={"favorited": False, "message": "Removed from favorites"})

    favorite = Favorite(
        user_id=user_id,
        wallpaper_id=wallpaper_id,
        collection_name=collection_name
    )
    db.add(favorite)
    db.commit()

    return JSONResponse(content={"favorited": True, "message": "Added to favorites"})

@app.get("/api/favorites/{user_id}")
def get_favorites(user_id: int, db: Session = Depends(get_db)):
    favorites = db.query(Favorite).filter(Favorite.user_id == user_id).all()

    return JSONResponse(content=[
        {
            "id": f.id,
            "wallpaper_id": f.wallpaper_id,
            "collection_name": f.collection_name,
            "wallpaper": {
                "id": f.wallpaper.id,
                "title": f.wallpaper.title,
                "category": f.wallpaper.category,
                "image_url": f.wallpaper.image_url,
                "thumbnail_url": f.wallpaper.thumbnail_url or f.wallpaper.image_url
            }
        }
        for f in favorites
    ])

@app.get("/api/favorites/{user_id}/collections")
def get_collections(user_id: int, db: Session = Depends(get_db)):
    collections = db.query(Favorite.collection_name).filter(
        Favorite.user_id == user_id,
        Favorite.collection_name.isnot(None)
    ).distinct().all()

    return JSONResponse(content=[c[0] for c in collections if c[0]])

@app.get("/api/favorites/{user_id}/collection/{collection_name}")
def get_collection_wallpapers(user_id: int, collection_name: str, db: Session = Depends(get_db)):
    favorites = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.collection_name == collection_name
    ).all()

    return JSONResponse(content=[
        {
            "id": f.wallpaper.id,
            "title": f.wallpaper.title,
            "category": f.wallpaper.category,
            "image_url": f.wallpaper.image_url,
            "thumbnail_url": f.wallpaper.thumbnail_url or f.wallpaper.image_url
        }
        for f in favorites
    ])

@app.get("/api/wallpapers/{wallpaper_id}/is_favorite")
def check_favorite(wallpaper_id: int, user_id: int = Query(...), db: Session = Depends(get_db)):
    exists = db.query(Favorite).filter(
        Favorite.user_id == user_id,
        Favorite.wallpaper_id == wallpaper_id
    ).first()
    return JSONResponse(content={"is_favorite": bool(exists)})

# ==================== LEGAL PAGES ====================

@app.get("/privacy", response_class=HTMLResponse)
def privacy():
    return HTMLResponse(content=PRIVACY_HTML)

@app.get("/terms", response_class=HTMLResponse)
def terms():
    return HTMLResponse(content=TERMS_HTML)

@app.get("/contact", response_class=HTMLResponse)
def contact():
    return HTMLResponse(content=CONTACT_HTML)

# ==================== LEGAL PAGE HTML ====================

PRIVACY_HTML = """<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Privacy - Phonetic</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><style>:root{--bg-primary:#0a0a0f;--bg-secondary:#12121a;--bg-card:#16161f;--text-primary:#f0f0f5;--text-secondary:#a0a0b0;--text-muted:#6b6b7b;--accent:#6366f1;--accent-pink:#d946ef;--border:rgba(255,255,255,0.06)}[data-theme="light"]{--bg-primary:#fafafa;--bg-secondary:#f0f0f5;--bg-card:#ffffff;--text-primary:#0f0f1a;--text-secondary:#4a4a5a;--text-muted:#8a8a9a;--accent:#4f46e5;--border:rgba(0,0,0,0.06)}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:var(--bg-primary);color:var(--text-primary);line-height:1.7;min-height:100vh}.container{max-width:800px;margin:0 auto;padding:3rem 1.5rem}.logo{display:flex;align-items:center;gap:0.75rem;text-decoration:none;color:var(--text-primary);margin-bottom:2rem}.logo-icon{width:40px;height:40px}.logo-text{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700}h1{font-family:'Space Grotesk',sans-serif;font-size:2.5rem;margin-bottom:1rem;background:linear-gradient(135deg,var(--accent),var(--accent-pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.last-updated{color:var(--text-muted);font-size:0.875rem;margin-bottom:2rem}h2{font-family:'Space Grotesk',sans-serif;font-size:1.25rem;margin:2rem 0 1rem;color:var(--text-primary)}p{color:var(--text-secondary);margin-bottom:1rem}ul{color:var(--text-secondary);margin-left:1.5rem;margin-bottom:1rem}li{margin-bottom:0.5rem}.back-link{display:inline-flex;align-items:center;gap:0.5rem;color:var(--accent);text-decoration:none;font-weight:600;margin-top:2rem;transition:all 0.3s ease}.back-link:hover{transform:translateX(-4px)}@media(max-width:640px){h1{font-size:1.75rem}.container{padding:2rem 1rem}}</style></head><body><div class="container"><a href="/" class="logo"><svg class="logo-icon" viewBox="0 0 40 40" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#d946ef"/></linearGradient></defs><circle cx="20" cy="20" r="18" stroke="url(#lg)" stroke-width="2.5"/><path d="M12 20h16M20 12v16" stroke="url(#lg)" stroke-width="2.5" stroke-linecap="round"/></svg><span class="logo-text">Phonetic</span></a><h1>Privacy Policy</h1><p class="last-updated">Last updated: June 15, 2026</p><h2>1. Information We Collect</h2><p>We collect minimal information:</p><ul><li><strong>Username:</strong> For saving favorites</li><li><strong>Theme preference:</strong> Stored locally</li><li><strong>Download history:</strong> Stored locally</li></ul><h2>2. Contact Us</h2><p><strong>Email:</strong> privacy@phonetic.app</p><a href="/" class="back-link">← Back to Home</a></div></body></html>"""

TERMS_HTML = """<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Terms - Phonetic</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><style>:root{--bg-primary:#0a0a0f;--bg-secondary:#12121a;--bg-card:#16161f;--text-primary:#f0f0f5;--text-secondary:#a0a0b0;--text-muted:#6b6b7b;--accent:#6366f1;--accent-pink:#d946ef;--border:rgba(255,255,255,0.06)}[data-theme="light"]{--bg-primary:#fafafa;--bg-secondary:#f0f0f5;--bg-card:#ffffff;--text-primary:#0f0f1a;--text-secondary:#4a4a5a;--text-muted:#8a8a9a;--accent:#4f46e5;--border:rgba(0,0,0,0.06)}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:var(--bg-primary);color:var(--text-primary);line-height:1.7;min-height:100vh}.container{max-width:800px;margin:0 auto;padding:3rem 1.5rem}.logo{display:flex;align-items:center;gap:0.75rem;text-decoration:none;color:var(--text-primary);margin-bottom:2rem}.logo-icon{width:40px;height:40px}.logo-text{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700}h1{font-family:'Space Grotesk',sans-serif;font-size:2.5rem;margin-bottom:1rem;background:linear-gradient(135deg,var(--accent),var(--accent-pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.last-updated{color:var(--text-muted);font-size:0.875rem;margin-bottom:2rem}h2{font-family:'Space Grotesk',sans-serif;font-size:1.25rem;margin:2rem 0 1rem;color:var(--text-primary)}p{color:var(--text-secondary);margin-bottom:1rem}ul{color:var(--text-secondary);margin-left:1.5rem;margin-bottom:1rem}li{margin-bottom:0.5rem}.back-link{display:inline-flex;align-items:center;gap:0.5rem;color:var(--accent);text-decoration:none;font-weight:600;margin-top:2rem;transition:all 0.3s ease}.back-link:hover{transform:translateX(-4px)}@media(max-width:640px){h1{font-size:1.75rem}.container{padding:2rem 1rem}}</style></head><body><div class="container"><a href="/" class="logo"><svg class="logo-icon" viewBox="0 0 40 40" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#d946ef"/></linearGradient></defs><circle cx="20" cy="20" r="18" stroke="url(#lg)" stroke-width="2.5"/><path d="M12 20h16M20 12v16" stroke="url(#lg)" stroke-width="2.5" stroke-linecap="round"/></svg><span class="logo-text">Phonetic</span></a><h1>Terms of Service</h1><p class="last-updated">Last updated: June 15, 2026</p><h2>1. Acceptance</h2><p>By using Phonetic, you agree to these terms.</p><h2>2. Contact</h2><p><strong>Email:</strong> legal@phonetic.app</p><a href="/" class="back-link">← Back to Home</a></div></body></html>"""

CONTACT_HTML = """<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Contact - Phonetic</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet"><style>:root{--bg-primary:#0a0a0f;--bg-secondary:#12121a;--bg-card:#16161f;--text-primary:#f0f0f5;--text-secondary:#a0a0b0;--text-muted:#6b6b7b;--accent:#6366f1;--accent-pink:#d946ef;--border:rgba(255,255,255,0.06)}[data-theme="light"]{--bg-primary:#fafafa;--bg-secondary:#f0f0f5;--bg-card:#ffffff;--text-primary:#0f0f1a;--text-secondary:#4a4a5a;--text-muted:#8a8a9a;--accent:#4f46e5;--border:rgba(0,0,0,0.06)}*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;background:var(--bg-primary);color:var(--text-primary);line-height:1.7;min-height:100vh}.container{max-width:800px;margin:0 auto;padding:3rem 1.5rem}.logo{display:flex;align-items:center;gap:0.75rem;text-decoration:none;color:var(--text-primary);margin-bottom:2rem}.logo-icon{width:40px;height:40px}.logo-text{font-family:'Space Grotesk',sans-serif;font-size:1.5rem;font-weight:700}h1{font-family:'Space Grotesk',sans-serif;font-size:2.5rem;margin-bottom:1rem;background:linear-gradient(135deg,var(--accent),var(--accent-pink));-webkit-background-clip:text;-webkit-text-fill-color:transparent}.subtitle{color:var(--text-secondary);margin-bottom:2rem}.contact-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:1.5rem;margin-top:2rem}.contact-card{background:var(--bg-card);border:1px solid var(--border);border-radius:16px;padding:1.5rem;transition:all 0.3s ease}.contact-card:hover{border-color:var(--accent);transform:translateY(-4px);box-shadow:0 8px 24px rgba(99,102,241,0.15)}.contact-card h3{font-family:'Space Grotesk',sans-serif;font-size:1.125rem;margin-bottom:0.5rem}.contact-card p{color:var(--text-secondary);font-size:0.875rem;margin-bottom:0.75rem}.contact-card a{color:var(--accent);text-decoration:none;font-weight:600;font-size:0.875rem}.contact-card a:hover{text-decoration:underline}.back-link{display:inline-flex;align-items:center;gap:0.5rem;color:var(--accent);text-decoration:none;font-weight:600;margin-top:2rem;transition:all 0.3s ease}.back-link:hover{transform:translateX(-4px)}@media(max-width:640px){h1{font-size:1.75rem}.container{padding:2rem 1rem}.contact-grid{grid-template-columns:1fr}}</style></head><body><div class="container"><a href="/" class="logo"><svg class="logo-icon" viewBox="0 0 40 40" fill="none"><defs><linearGradient id="lg" x1="0" y1="0" x2="40" y2="40"><stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#d946ef"/></linearGradient></defs><circle cx="20" cy="20" r="18" stroke="url(#lg)" stroke-width="2.5"/><path d="M12 20h16M20 12v16" stroke="url(#lg)" stroke-width="2.5" stroke-linecap="round"/></svg><span class="logo-text">Phonetic</span></a><h1>Contact Us</h1><p class="subtitle">We'd love to hear from you.</p><div class="contact-grid"><div class="contact-card"><h3>General Support</h3><p>For questions and technical support.</p><a href="mailto:support@phonetic.app">support@phonetic.app</a></div><div class="contact-card"><h3>DMCA</h3><p>For copyright claims.</p><a href="mailto:dmca@phonetic.app">dmca@phonetic.app</a></div><div class="contact-card"><h3>Business</h3><p>For partnerships.</p><a href="mailto:business@phonetic.app">business@phonetic.app</a></div><div class="contact-card"><h3>Feedback</h3><p>Suggest features or report bugs.</p><a href="mailto:feedback@phonetic.app">feedback@phonetic.app</a></div></div><a href="/" class="back-link">← Back to Home</a></div></body></html>"""