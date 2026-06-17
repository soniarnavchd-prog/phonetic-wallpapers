import os
from fastapi import FastAPI, Request, Depends, Query, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import engine, SessionLocal, Base
from models import Wallpaper, User, Favorite, Collection
from cloudinary_config import upload_image, get_transformed_url

PORT = int(os.getenv("PORT", 8000))

app = FastAPI()

# Static files
app.mount("/static", StaticFiles(directory="static"), name="static")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def read_html_template():
    try:
        with open("templates/index.html", "r", encoding="utf-8") as f:
            content = f.read()
        return content
    except FileNotFoundError:
        return "<html><body><h1>Template not found</h1></body></html>"

HTML_CONTENT = read_html_template()

LOCAL_FOLDERS = ["abstract", "space", "surreal", "Minimalist", "cyberpunk", "nature", "technology", "sports", "music", "cars", "anime", "top-rated", "premium"]

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Wallpaper).count()
        has_local_folders = any(os.path.exists(f) for f in LOCAL_FOLDERS)
        
        if count == 0 and not has_local_folders:
            seed_wallpapers = [
                Wallpaper(title="Neon Horizon", category="Sci-Fi", image_url="https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Abstract Flow", category="Abstract", image_url="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Deep Space", category="AMOLED", image_url="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Minimal White", category="Minimal", image_url="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Forest Mist", category="Nature", image_url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Cyber Grid", category="Sci-Fi", image_url="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80", thumbnail_url=None, public_id=None),
            ]
            for wallpaper in seed_wallpapers:
                db.add(wallpaper)
            db.commit()
            print("Seeded with Unsplash wallpapers")
        elif count == 0 and has_local_folders:
            print("Local folders detected. Run: python upload_local.py")
        else:
            print(f"Database has {count} wallpapers. Skipping seed.")
    finally:
        db.close()

@app.get("/")
def index():
    return HTMLResponse(content=HTML_CONTENT)

@app.get("/api/wallpapers")
def get_wallpapers(category: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(Wallpaper)
    if category and category != "all":
        slug_map = {
            "scifi": "Sci-Fi",
            "amoled": "AMOLED",
            "minimal": "Minimal",
            "abstract": "Abstract",
            "nature": "Nature",
            "technology": "Technology",
            "sports": "Sports",
            "music": "Music",
            "cars": "Cars",
            "anime": "Anime",
            "top-rated": "Top Rated",
            "premium": "Premium",
            "space": "Space",
            "surreal": "Surreal",
            "cyberpunk": "Cyberpunk",
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

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        count = db.query(Wallpaper).count()
        
        if count == 0:
            # Seed with sample wallpapers if DB is empty
            seed_wallpapers = [
                Wallpaper(title="Neon Horizon", category="Sci-Fi", image_url="https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Abstract Flow", category="Abstract", image_url="https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Deep Space", category="AMOLED", image_url="https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Minimal White", category="Minimal", image_url="https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Forest Mist", category="Nature", image_url="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Cyber Grid", category="Sci-Fi", image_url="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Ocean Waves", category="Abstract", image_url="https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Mountain Peak", category="Nature", image_url="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="City Lights", category="Technology", image_url="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80", thumbnail_url=None, public_id=None),
                Wallpaper(title="Sports Car", category="Cars", image_url="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1920&q=80", thumbnail_url=None, public_id=None),
            ]
            for wallpaper in seed_wallpapers:
                db.add(wallpaper)
            db.commit()
            print(f"Seeded {len(seed_wallpapers)} wallpapers")
        else:
            print(f"Database has {count} wallpapers. Skipping seed.")
    finally:
        db.close()

# ==================== LEGAL PAGES ====================

@app.get("/privacy")
def privacy():
    return HTMLResponse(content='''
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - Phonetic</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-card: #16161f;
            --text-primary: #f0f0f5;
            --text-secondary: #a0a0b0;
            --text-muted: #6b6b7b;
            --accent: #6366f1;
            --accent-pink: #d946ef;
            --border: rgba(255,255,255,0.06);
        }
        [data-theme="light"] {
            --bg-primary: #fafafa;
            --bg-secondary: #f0f0f5;
            --bg-card: #ffffff;
            --text-primary: #0f0f1a;
            --text-secondary: #4a4a5a;
            --text-muted: #8a8a9a;
            --accent: #4f46e5;
            --border: rgba(0,0,0,0.06);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 3rem 1.5rem;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: var(--text-primary);
            margin-bottom: 2rem;
        }
        .logo-icon { width: 40px; height: 40px; }
        .logo-text {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
        }
        h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2.5rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--accent), var(--accent-pink));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .last-updated {
            color: var(--text-muted);
            font-size: 0.875rem;
            margin-bottom: 2rem;
        }
        h2 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.25rem;
            margin: 2rem 0 1rem;
            color: var(--text-primary);
        }
        p {
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }
        ul {
            color: var(--text-secondary);
            margin-left: 1.5rem;
            margin-bottom: 1rem;
        }
        li { margin-bottom: 0.5rem; }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
            margin-top: 2rem;
            transition: all 0.3s ease;
        }
        .back-link:hover {
            transform: translateX(-4px);
        }
        @media (max-width: 640px) {
            h1 { font-size: 1.75rem; }
            .container { padding: 2rem 1rem; }
        }
    </style>
</head>

<!-- Emergency fix if app.js fails -->
<script>
    // Fallback if main app.js crashes
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.message);
    });
    
    // Check if app loaded
    setTimeout(function() {
        if (typeof wallpapers === 'undefined' || wallpapers.length === 0) {
            console.log('App not loaded, trying emergency fetch...');
            fetch('/api/wallpapers')
                .then(r => r.json())
                .then(data => {
                    console.log('Emergency load:', data.length, 'wallpapers');
                    if (data.length > 0) {
                        // Simple render
                        const grid = document.getElementById('galleryGrid');
                        if (grid) {
                            grid.innerHTML = '';
                            data.forEach(w => {
                                const div = document.createElement('div');
                                div.style.cssText = 'margin:10px;border-radius:16px;overflow:hidden;cursor:pointer;';
                                div.innerHTML = `
                                    <img src="${w.thumbnail_url || w.image_url}" style="width:100%;height:250px;object-fit:cover;" 
                                         onerror="this.src='${w.image_url}'">
                                    <div style="padding:10px;background:var(--bg-card);">
                                        <div style="font-weight:600;">${w.title}</div>
                                        <div style="font-size:0.8rem;color:var(--text-muted);">${w.category}</div>
                                    </div>
                                `;
                                div.onclick = () => window.open(w.image_url, '_blank');
                                grid.appendChild(div);
                            });
                            
                            // Update stats
                            const statCount = document.getElementById('statCount');
                            if (statCount) statCount.textContent = data.length;
                            
                            // Fix WOTD
                            const wotdImg = document.getElementById('wotdImage');
                            const wotdTitle = document.getElementById('wotdTitle');
                            const wotdDesc = document.getElementById('wotdDesc');
                            if (wotdImg && data[0]) {
                                wotdImg.src = data[0].thumbnail_url || data[0].image_url;
                                wotdImg.onerror = () => wotdImg.src = data[0].image_url;
                            }
                            if (wotdTitle && data[0]) wotdTitle.textContent = data[0].title;
                            if (wotdDesc && data[0]) wotdDesc.textContent = data[0].category;
                        }
                    }
                })
                .catch(err => console.error('Emergency fetch failed:', err));
        }
    }, 5000); // Wait 5 seconds then check
</script>
<body>
    <div class="container">
        <a href="/" class="logo">
            <svg class="logo-icon" viewBox="0 0 40 40" fill="none">
                <defs>
                    <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stop-color="#6366f1"/>
                        <stop offset="100%" stop-color="#d946ef"/>
                    </linearGradient>
                </defs>
                <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" stroke-width="2.5"/>
                <path d="M12 20h16M20 12v16" stroke="url(#logoGrad)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span class="logo-text">Phonetic</span>
        </a>
        
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: June 15, 2026</p>
        
        <h2>1. Information We Collect</h2>
        <p>We collect minimal information to provide our services:</p>
        <ul>
            <li><strong>Username:</strong> When you create an account to save favorites</li>
            <li><strong>Theme preference:</strong> Stored locally in your browser</li>
            <li><strong>Download history:</strong> Stored locally to enforce daily limits</li>
            <li><strong>Usage data:</strong> Anonymous analytics to improve our service</li>
        </ul>
        
        <h2>2. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
            <li>Provide personalized wallpaper recommendations</li>
            <li>Save your favorite wallpapers and collections</li>
            <li>Improve website performance and user experience</li>
            <li>Display relevant advertisements</li>
        </ul>
        
        <h2>3. Cookies and Tracking</h2>
        <p>We use cookies and similar technologies to:</p>
        <ul>
            <li>Remember your theme preference (dark/light mode)</li>
            <li>Track daily download limits for free users</li>
            <li>Deliver personalized advertisements through Google AdSense</li>
        </ul>
        
        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services:</p>
        <ul>
            <li><strong>Google AdSense:</strong> For displaying advertisements</li>
            <li><strong>Cloudinary:</strong> For image hosting and delivery</li>
            <li><strong>Google Analytics:</strong> For anonymous usage statistics</li>
        </ul>
        
        <h2>5. Data Security</h2>
        <p>We implement appropriate security measures to protect your personal information. However, no method of transmission over the internet is 100% secure.</p>
        
        <h2>6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
            <li>Access your personal data</li>
            <li>Delete your account and associated data</li>
            <li>Opt-out of personalized advertising</li>
            <li>Request data portability</li>
        </ul>
        
        <h2>7. Contact Us</h2>
        <p>If you have any questions about this Privacy Policy, please contact us at:</p>
        <p><strong>Email:</strong> privacy@phonetic.app</p>
        
        <a href="/" class="back-link">← Back to Home</a>
    </div>
</body>
</html>
    ''')

@app.get("/terms")
def terms():
    return HTMLResponse(content='''
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - Phonetic</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-card: #16161f;
            --text-primary: #f0f0f5;
            --text-secondary: #a0a0b0;
            --text-muted: #6b6b7b;
            --accent: #6366f1;
            --accent-pink: #d946ef;
            --border: rgba(255,255,255,0.06);
        }
        [data-theme="light"] {
            --bg-primary: #fafafa;
            --bg-secondary: #f0f0f5;
            --bg-card: #ffffff;
            --text-primary: #0f0f1a;
            --text-secondary: #4a4a5a;
            --text-muted: #8a8a9a;
            --accent: #4f46e5;
            --border: rgba(0,0,0,0.06);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 3rem 1.5rem;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: var(--text-primary);
            margin-bottom: 2rem;
        }
        .logo-icon { width: 40px; height: 40px; }
        .logo-text {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
        }
        h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2.5rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--accent), var(--accent-pink));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .last-updated {
            color: var(--text-muted);
            font-size: 0.875rem;
            margin-bottom: 2rem;
        }
        h2 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.25rem;
            margin: 2rem 0 1rem;
            color: var(--text-primary);
        }
        p {
            color: var(--text-secondary);
            margin-bottom: 1rem;
        }
        ul {
            color: var(--text-secondary);
            margin-left: 1.5rem;
            margin-bottom: 1rem;
        }
        li { margin-bottom: 0.5rem; }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
            margin-top: 2rem;
            transition: all 0.3s ease;
        }
        .back-link:hover {
            transform: translateX(-4px);
        }
        @media (max-width: 640px) {
            h1 { font-size: 1.75rem; }
            .container { padding: 2rem 1rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="logo">
            <svg class="logo-icon" viewBox="0 0 40 40" fill="none">
                <defs>
                    <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stop-color="#6366f1"/>
                        <stop offset="100%" stop-color="#d946ef"/>
                    </linearGradient>
                </defs>
                <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" stroke-width="2.5"/>
                <path d="M12 20h16M20 12v16" stroke="url(#logoGrad)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span class="logo-text">Phonetic</span>
        </a>
        
        <h1>Terms of Service</h1>
        <p class="last-updated">Last updated: June 15, 2026</p>
        
        <h2>1. Acceptance of Terms</h2>
        <p>By accessing and using Phonetic ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.</p>
        
        <h2>2. Description of Service</h2>
        <p>Phonetic provides a platform for discovering, previewing, and downloading wallpapers for personal use. The Service includes both free and premium content.</p>
        
        <h2>3. User Accounts</h2>
        <p>When you create an account, you agree to:</p>
        <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account</li>
            <li>Accept responsibility for all activities under your account</li>
            <li>Not share your account credentials with others</li>
        </ul>
        
        <h2>4. Content and Copyright</h2>
        <p>All wallpapers on Phonetic are provided for personal use only. You may not:</p>
        <ul>
            <li>Redistribute or resell wallpapers</li>
            <li>Use wallpapers for commercial purposes without permission</li>
            <li>Claim ownership of wallpapers you did not create</li>
            <li>Remove watermarks or attribution when present</li>
        </ul>
        
        <h2>5. Free and Premium Downloads</h2>
        <p>Phonetic offers:</p>
        <ul>
            <li><strong>Free downloads:</strong> Limited number per day with advertisement support</li>
            <li><strong>Premium downloads:</strong> High-resolution wallpapers requiring additional advertisement views</li>
            <li><strong>Subscription:</strong> Optional paid subscription for unlimited ad-free downloads</li>
        </ul>
        
        <h2>6. Advertisements</h2>
        <p>The Service is supported by advertisements. By using the free tier, you agree to view advertisements as a condition of downloading wallpapers. We partner with Google AdSense and other advertising networks.</p>
        
        <h2>7. Prohibited Activities</h2>
        <p>You agree not to:</p>
        <ul>
            <li>Use automated tools to download wallpapers in bulk</li>
            <li>Attempt to bypass advertisement requirements</li>
            <li>Interfere with the proper functioning of the Service</li>
            <li>Upload malicious content or malware</li>
        </ul>
        
        <h2>8. Termination</h2>
        <p>We reserve the right to terminate or suspend your account at any time for violations of these terms or for any other reason at our discretion.</p>
        
        <h2>9. Disclaimer</h2>
        <p>The Service is provided "as is" without warranties of any kind. We do not guarantee uninterrupted access or that wallpapers will meet your specific requirements.</p>
        
        <h2>10. Contact</h2>
        <p>For questions about these Terms, contact us at: <strong>legal@phonetic.app</strong></p>
        
        <a href="/" class="back-link">← Back to Home</a>
    </div>
</body>
</html>
    ''')

@app.get("/contact")
def contact():
    return HTMLResponse(content='''
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Us - Phonetic</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-card: #16161f;
            --text-primary: #f0f0f5;
            --text-secondary: #a0a0b0;
            --text-muted: #6b6b7b;
            --accent: #6366f1;
            --accent-pink: #d946ef;
            --border: rgba(255,255,255,0.06);
        }
        [data-theme="light"] {
            --bg-primary: #fafafa;
            --bg-secondary: #f0f0f5;
            --bg-card: #ffffff;
            --text-primary: #0f0f1a;
            --text-secondary: #4a4a5a;
            --text-muted: #8a8a9a;
            --accent: #4f46e5;
            --border: rgba(0,0,0,0.06);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Inter', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.7;
            min-height: 100vh;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 3rem 1.5rem;
        }
        .logo {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            text-decoration: none;
            color: var(--text-primary);
            margin-bottom: 2rem;
        }
        .logo-icon { width: 40px; height: 40px; }
        .logo-text {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
        }
        h1 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2.5rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, var(--accent), var(--accent-pink));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            color: var(--text-secondary);
            margin-bottom: 2rem;
        }
        .contact-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-top: 2rem;
        }
        .contact-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            transition: all 0.3s ease;
        }
        .contact-card:hover {
            border-color: var(--accent);
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(99,102,241,0.15);
        }
        .contact-card h3 {
            font-family: 'Space Grotesk', sans-serif;
            font-size: 1.125rem;
            margin-bottom: 0.5rem;
        }
        .contact-card p {
            color: var(--text-secondary);
            font-size: 0.875rem;
            margin-bottom: 0.75rem;
        }
        .contact-card a {
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
            font-size: 0.875rem;
        }
        .contact-card a:hover {
            text-decoration: underline;
        }
        .back-link {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--accent);
            text-decoration: none;
            font-weight: 600;
            margin-top: 2rem;
            transition: all 0.3s ease;
        }
        .back-link:hover {
            transform: translateX(-4px);
        }
        @media (max-width: 640px) {
            h1 { font-size: 1.75rem; }
            .container { padding: 2rem 1rem; }
            .contact-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="logo">
            <svg class="logo-icon" viewBox="0 0 40 40" fill="none">
                <defs>
                    <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                        <stop offset="0%" stop-color="#6366f1"/>
                        <stop offset="100%" stop-color="#d946ef"/>
                    </linearGradient>
                </defs>
                <circle cx="20" cy="20" r="18" stroke="url(#logoGrad)" stroke-width="2.5"/>
                <path d="M12 20h16M20 12v16" stroke="url(#logoGrad)" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
            <span class="logo-text">Phonetic</span>
        </a>
        
        <h1>Contact Us</h1>
        <p class="subtitle">We'd love to hear from you. Reach out for support, partnerships, or just to say hello.</p>
        
        <div class="contact-grid">
            <div class="contact-card">
                <h3>General Support</h3>
                <p>For questions about using Phonetic, account issues, or technical support.</p>
                <a href="mailto:support@phonetic.app">support@phonetic.app</a>
            </div>
            
            <div class="contact-card">
                <h3>DMCA & Copyright</h3>
                <p>For copyright claims, takedown requests, or licensing inquiries.</p>
                <a href="mailto:dmca@phonetic.app">dmca@phonetic.app</a>
            </div>
            
            <div class="contact-card">
                <h3>Business & Partnerships</h3>
                <p>For advertising partnerships, API access, or business inquiries.</p>
                <a href="mailto:business@phonetic.app">business@phonetic.app</a>
            </div>
            
            <div class="contact-card">
                <h3>Feedback</h3>
                <p>Suggest features, report bugs, or share your experience with us.</p>
                <a href="mailto:feedback@phonetic.app">feedback@phonetic.app</a>
            </div>
        </div>
        
        <a href="/" class="back-link">← Back to Home</a>
    </div>
</body>
</html>
    ''')