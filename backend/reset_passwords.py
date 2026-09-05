import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

emails = [
    "admin@shin.local",
    "george.james90@shin.local",
    "wanda.lindsey58@shin.local",
    "lisa.brooks32@shin.local",
    "teresa.crawford36@shin.local",
    "david.mitchell84@shin.local",
    "kenneth.hill17@shin.local",
    "audit@shin.local",
    "melissa.key8@shin.local",
]

for email in emails:
    user = User.objects.filter(email=email).first()
    if user:
        user.set_password('Password123!')
        user.save()
        print(f"Updated password for {email}")
