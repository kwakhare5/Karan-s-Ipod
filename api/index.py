import sys
import os

# Add the project root to sys.path so we can import server.py
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from server import app

# This file is the entry point for Vercel's Python runtime.
# By importing 'app', Vercel can serve the Flask application.
