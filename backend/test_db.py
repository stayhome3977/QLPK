import traceback
from sqlalchemy import create_engine
from app.core.config import settings

def test_connection():
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            print("SUCCESS")
    except Exception as e:
        print("FAILED: Could not connect to database.")
        print(traceback.format_exc())

if __name__ == '__main__':
    test_connection()
