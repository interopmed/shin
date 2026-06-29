"""One-time script to create audit log and threat intelligence tables and seed demo data."""
import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
# Ensure the backend directory is in the path
script_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(script_dir)
sys.path.insert(0, backend_dir)

django.setup()

from django.db import connection

def seed_audit():
    with connection.cursor() as cursor:
        # Create audit_event table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS audit_event (
                id BIGSERIAL PRIMARY KEY,
                timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
                event_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(100) NOT NULL,
                action VARCHAR(100) NOT NULL,
                object_type VARCHAR(200) NOT NULL,
                source_system VARCHAR(100) NOT NULL,
                severity VARCHAR(50) NOT NULL,
                trace_id VARCHAR(100) NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)
        
        # Create indexes
        cursor.execute("CREATE INDEX IF NOT EXISTS audit_event_timestamp_idx ON audit_event (timestamp DESC)")
        cursor.execute("CREATE INDEX IF NOT EXISTS audit_event_user_id_idx ON audit_event (user_id)")

        # Create threat_alert table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS threat_alert (
                id BIGSERIAL PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                score INTEGER NOT NULL DEFAULT 0,
                confidence INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)

        # Check if audit events already exist
        cursor.execute("SELECT COUNT(*) FROM audit_event")
        event_count = cursor.fetchone()[0]

        now = timezone.now()

        if event_count == 0:
            # Seed diverse audit events with relative timestamps
            events = [
                # Event 1: Recent PHI read
                (now - timedelta(minutes=5), "10013", "Admin-TW", "PATIENT_READ", "Bessie Cooper (EID-P10001)", "MedTrackr Core", "Low", "32eV8Bul"),
                # Event 2: EHR access
                (now - timedelta(minutes=15), "10013", "Admin-TW", "PATIENT_READ", "Bessie Cooper (EID-P10001)", "MedTrackr Core", "Low", "32eV8Oul"),
                # Event 3: MPI Link edit (medium risk)
                (now - timedelta(hours=1, minutes=10), "10014", "Epic Feed Node", "MPI_LINK_EDIT", "Bessie Cooper (EID-P10001)", "MPI Engine", "Medium", "ATNA Rule 4.1.2"),
                # Event 4: PHI View alertable
                (now - timedelta(hours=2), "10013", "Admin-TW", "PHI_VIEW", "Epic Data Feed", "Epic Feed Node", "High", "32eV8Oul"),
                # Event 5: PHI View consent flag
                (now - timedelta(hours=3, minutes=30), "10015", "Dr. Adam Bennett", "PHI_VIEW", "Bessie Cooper (EID-P10001)", "EHR Notes", "Low", "32eV8Oul"),
                # Event 6: PHI View warning
                (now - timedelta(hours=4, minutes=45), "10015", "Epic Feed Node", "PHI_VIEW", "Epic Data Feed", "Epic Feed Node", "Medium", "ATNA Rule"),
                # Event 7: Consent preference update
                (now - timedelta(hours=6), "10016", "Admin-TW", "CONSENT_FLAG", "Bessie Cooper (EID-P10001)", "Consent Manager", "Low", "32eV8Uul"),
                # Event 8: Failed logins (brute force threat)
                (now - timedelta(hours=12, minutes=5), "10017", "Unknown-IP", "LOGIN_ATTEMPT", "Portal Login", "Identity Access", "High", "32enBUl"),
                (now - timedelta(hours=12, minutes=6), "10017", "Unknown-IP", "LOGIN_ATTEMPT", "Portal Login", "Identity Access", "High", "32enBUl"),
                (now - timedelta(hours=12, minutes=7), "10017", "Unknown-IP", "LOGIN_ATTEMPT", "Portal Login", "Identity Access", "High", "32enBUl"),
                # Event 11: Normal operations
                (now - timedelta(hours=18), "10013", "Theresa Webb", "PROFILE_VERIFY", "Bessie Cooper (EID-P10001)", "Patient Directory", "Low", "32enBUl"),
                # Event 12: Normal clinic access
                (now - timedelta(hours=22), "10015", "Dr. Adam Bennett", "CLINICAL_NOTE_READ", "Bessie Cooper (EID-P10001)", "EHR Notes", "Low", "32eV8Oul"),
                # Event 13: Older events (outside 24h)
                (now - timedelta(days=1, hours=2), "10013", "Admin-TW", "PATIENT_READ", "Bessie Cooper (EID-P10001)", "MedTrackr Core", "Low", "32eV8Bul"),
                (now - timedelta(days=1, hours=5), "10018", "System-Scheduler", "BACKUP_RUN", "Patient Database", "Core DB Utility", "Low", "32eSYS01"),
                (now - timedelta(days=2), "10019", "Admin-TW", "ROLE_ASSIGN", "Dr. Adam Bennett (Doctor)", "Identity Access", "Medium", "32eSYS02"),
            ]
            
            for timestamp, event_id, user_id, action, object_type, source_system, severity, trace_id in events:
                cursor.execute(
                    """INSERT INTO audit_event 
                       (timestamp, event_id, user_id, action, object_type, source_system, severity, trace_id) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    (timestamp, event_id, user_id, action, object_type, source_system, severity, trace_id)
                )
            print(f"Seeded {len(events)} audit events.")
        else:
            print(f"Audit event table already has {event_count} records. Skipping seed.")

        # Check if threat alerts already exist
        cursor.execute("SELECT COUNT(*) FROM threat_alert")
        alert_count = cursor.fetchone()[0]

        if alert_count == 0:
            alerts = [
                ("PHI_VIEW from unusual location", 1, 50),
                ("Failed Login Brute Force", 0, 61),
                ("Unusual volume of export logs", 2, 75),
                ("ATNA Rule validation failure", 0, 85),
            ]
            for title, score, confidence in alerts:
                cursor.execute(
                    "INSERT INTO threat_alert (title, score, confidence) VALUES (%s, %s, %s)",
                    (title, score, confidence)
                )
            print(f"Seeded {len(alerts)} threat alerts.")
        else:
            print(f"Threat alert table already has {alert_count} records. Skipping seed.")

    print("Audit database seeding done.")

if __name__ == "__main__":
    seed_audit()
