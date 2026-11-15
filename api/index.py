import sys
import os

# Menambahkan folder backend ke jalur sistem python Vercel
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from main import app