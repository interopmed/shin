import psycopg2

connection_string = "postgres://postgres:Sb%401230588@localhost:5432/shin"

def main():
    try:
        conn = psycopg2.connect(connection_string)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE system_setting 
            SET is_editable = true 
            WHERE key IN ('feeds.epic', 'feeds.hl7', 'feeds.fhir');
        """)
        
        conn.commit()
        print(f"Updated {cursor.rowcount} rows in system_setting table.")
        
        cursor.close()
        conn.close()
    except Exception as e:
        print("Error updating DB:", e)

if __name__ == "__main__":
    main()
