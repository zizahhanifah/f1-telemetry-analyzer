import sys
import os

# Menambahkan folder backend ke jalur sistem Python
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend'))
sys.path.append(backend_path)

# Import langsung dari modul backend.main
from backend.main import app