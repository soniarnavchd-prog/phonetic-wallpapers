from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class Wallpaper(Base):
    __tablename__ = "wallpapers"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=False, index=True)
    image_url = Column(String, nullable=False)
    thumbnail_url = Column(String, nullable=True)
    public_id = Column(String, nullable=True)
    # NEW: True black percentage for AMOLED wallpapers
    true_black_pct = Column(Float, nullable=True)
    
    # Relationship to favorites
    favorites = relationship("Favorite", back_populates="wallpaper", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    email = Column(String, unique=True, nullable=True, index=True) # Nullable for old users
    hashed_password = Column(String, nullable=True) # Nullable for Google-only users
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to favorites
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    
class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    wallpaper_id = Column(Integer, ForeignKey("wallpapers.id"), nullable=False)
    collection_name = Column(String, nullable=True)  # e.g., "Work Setup", "Winter Mood"
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="favorites")
    wallpaper = relationship("Wallpaper", back_populates="favorites")

class Collection(Base):
    __tablename__ = "collections"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    is_public = Column(Integer, default=0)  # 0 = private, 1 = public
    created_at = Column(DateTime, default=datetime.utcnow)