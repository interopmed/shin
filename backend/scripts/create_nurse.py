import os
import sys
import django

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.db import connection
from apps.core.models import IdentityRole, IdentityUser, IdentityUserRole

User = get_user_model()

def fix_sequences():
    with connection.cursor() as cursor:
        cursor.execute("SELECT setval(pg_get_serial_sequence('auth_user', 'id'), coalesce(max(id), 1), true) FROM auth_user;")
        cursor.execute("SELECT setval(pg_get_serial_sequence('identity_role', 'id'), coalesce(max(id), 1), true) FROM identity_role;")
        cursor.execute("SELECT setval(pg_get_serial_sequence('identity_user', 'id'), coalesce(max(id), 1), true) FROM identity_user;")

def create_nurse():
    fix_sequences()
    
    username = "nurse.shin.local"
    password = "password123"
    email = "nurse@shin.local"
    
    try:
        auth_user = User.objects.get(username=username)
        auth_user.set_password(password)
        auth_user.save()
        print(f"Auth user {username} updated.")
    except User.DoesNotExist:
        auth_user = User.objects.create_user(username=username, email=email, password=password)
        print(f"Auth user {username} created.")

    # 2. Create IdentityRole
    role, r_created = IdentityRole.objects.get_or_create(
        code="nurse",
        defaults={"name": "Nurse", "description": "Nurse Role"}
    )
    if r_created:
        print("IdentityRole 'nurse' created.")
        
    # 3. Create IdentityUser
    ident_user, iu_created = IdentityUser.objects.get_or_create(
        username=username,
        defaults={
            "display_name": "Nurse user",
            "email": email,
            "title": "Nurse",
            "status": "Active"
        }
    )
    if iu_created:
        print("IdentityUser created.")

    # 4. Link Role and User
    IdentityUserRole.objects.get_or_create(
        user=ident_user,
        role=role
    )
    print("IdentityUserRole linked.")
    print(f"Credentials:\nEmail: {email}\nUsername: {username}\nPassword: {password}")

if __name__ == "__main__":
    create_nurse()
