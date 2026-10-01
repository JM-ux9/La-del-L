import asyncpg
from dotenv import load_dotenv
import os

# Load environment variables from .env
load_dotenv()

# Fetch variables
DATABASE_URL = os.getenv("DATABASE_URL")

# Connect to the database
async def create_pool():
    return await asyncpg.create_pool(DATABASE_URL)