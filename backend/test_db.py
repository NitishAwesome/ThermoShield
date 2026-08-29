from app.database.connection import engine


try:
    with engine.connect():
        print("PostgreSQL connection successful.")

except Exception as error:
    print("PostgreSQL connection failed.")
    print(error)