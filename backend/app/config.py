import os
from dotenv import load_dotenv

load_dotenv()

NOMINATIM_URL = os.getenv(
    "NOMINATIM_URL",
    "https://nominatim.openstreetmap.org/search"
)