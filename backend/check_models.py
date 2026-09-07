from app.database.connection import Base
from app.database.models import (
    User, Location, Risk, Alert, Intervention
)

print("Registered tables:")

for table in Base.metadata.tables:
    print(f"- {table}")

print("\nRelationships:")

print("User -> Alerts")
print("Location -> Risks")
print("Location -> Alerts")
print("Location -> Interventions")