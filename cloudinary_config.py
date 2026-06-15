import os
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

def upload_image(file_path: str, public_id: str = None):
    """Upload an image to Cloudinary. Returns the secure URL."""
    result = cloudinary.uploader.upload(
        file_path,
        public_id=public_id,
        overwrite=True,
        resource_type="image"
    )
    return result.get("secure_url")

def upload_image_from_url(image_url: str, public_id: str = None):
    """Upload an image to Cloudinary from a remote URL."""
    result = cloudinary.uploader.upload(
        image_url,
        public_id=public_id,
        overwrite=True,
        resource_type="image"
    )
    return result.get("secure_url")

def get_transformed_url(public_id: str, width: int = None, height: int = None, crop: str = "fill"):
    """Generate a transformed Cloudinary URL."""
    options = {"crop": crop, "quality": "auto", "fetch_format": "auto"}
    if width:
        options["width"] = width
    if height:
        options["height"] = height
    return cloudinary.CloudinaryImage(public_id).build_url(**options)