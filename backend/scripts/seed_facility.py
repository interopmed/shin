"""One-time script to create the facility table and seed demo data."""
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, __file__.replace("scripts\\seed_facility.py", "").replace("scripts/", ""))
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS facility (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'Hospital',
            location VARCHAR(200) NOT NULL DEFAULT '',
            departments INTEGER NOT NULL DEFAULT 0,
            rooms INTEGER NOT NULL DEFAULT 0,
            status VARCHAR(50) NOT NULL DEFAULT 'Operational',
            occupancy VARCHAR(10) NOT NULL DEFAULT '0%',
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Check if data already exists
    cursor.execute("SELECT COUNT(*) FROM facility")
    count = cursor.fetchone()[0]
    
    if count == 0:
        seed_data = [
            ("Central Medical Center", "Hospital", "Colombo", 14, 128, "Operational", "82%"),
            ("Northside Clinic", "Outpatient", "Kandy", 6, 42, "Operational", "61%"),
            ("InterOpMed Lab Hub", "Diagnostic Lab", "Galle", 5, 31, "Maintenance", "74%"),
            ("Virtual Care Center", "Telehealth", "Remote", 3, 18, "Operational", "45%"),
        ]
        for row in seed_data:
            cursor.execute(
                "INSERT INTO facility (name, type, location, departments, rooms, status, occupancy) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                row
            )
        print(f"Seeded {len(seed_data)} facilities.")
    else:
        print(f"Facility table already has {count} records. Skipping seed.")

print("Done.")