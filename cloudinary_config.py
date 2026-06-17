import os
import hashlib
import time
import requests
from dotenv import load_dotenv

load_dotenv()

CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
API_KEY = os.getenv("CLOUDINARY_API_KEY")
API_SECRET = os.getenv("CLOUDINARY_API_SECRET")

def generate_signature(params):
    """Generate Cloudinary signature."""
    sorted_params = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if v)
    string_to_sign = sorted_params + API_SECRET
    return hashlib.sha1(string_to_sign.encode()).hexdigest()

def upload_image(file_path: str, public_id: str = None):
    """Upload an image to Cloudinary using requests."""
    url = f"https://api.cloudinary.com/v1_1/{CLOUD_NAME}/image/upload"
    
    timestamp = str(int(time.time()))
    params = {
        "public_id": public_id,
        "timestamp": timestamp,
    }
    
    signature = generate_signature(params)
    
    with open(file_path, "rb") as f:
        files = {"file": f}
        data = {
            "public_id": public_id,
            "timestamp": timestamp,
            "api_key": API_KEY,
            "signature": signature,
        }
        
        response = requests.post(url, files=files, data=data)
        result = response.json()
        return result.get("secure_url")

def get_transformed_url(public_id: str, width: int = None, height: int = None, crop: str = "fill"):
    """Generate a transformed Cloudinary URL."""
    options = f"c_{crop},q_auto,f_auto"
    if width:
        options += f",w_{width}"
    if height:
        options += f",h_{height}"
    return f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/{options}/{public_id}"