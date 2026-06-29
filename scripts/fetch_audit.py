import psycopg2

connection_string = "postgres://postgres:Sb%401230588@localhost:5432/shin"

def main():
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        # Count events
        cursor.execute("SELECT COUNT(*) FROM audit_event;")
        event_count = cursor.fetchone()[0]
        
        # Count alerts
        cursor.execute("SELECT COUNT(*) FROM threat_alert;")
        alert_count = cursor.fetchone()[0]
        
        print(f"Total rows in audit_event table: {event_count}")
        print(f"Total rows in threat_alert table: {alert_count}")
        
        # Print a sample of 3 latest events from DB
        cursor.execute("SELECT timestamp, user_id, action, object_type, severity FROM audit_event ORDER BY timestamp DESC LIMIT 3;")
        print("\nLatest 3 events in DB:")
        for row in cursor.fetchall():
            print(f"- {row[0].strftime('%Y-%m-%d %H:%M:%S')} | User: {row[1]} | Action: {row[2]} | Object: {row[3]} | Severity: {row[4]}")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print("Error connecting/querying DB:", e)

if __name__ == "__main__":
    main()
