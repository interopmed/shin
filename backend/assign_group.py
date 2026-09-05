import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.core.models import IdentityUser, IdentityGroup, IdentityUserGroup, IdentityRole, IdentityUserRole

group = IdentityGroup.objects.filter(code="clinical-security").first()
if not group:
    print("clinical-security group not found")
    exit(1)

# Find doctors and nurses
roles = IdentityRole.objects.filter(code__in=["doctor", "nurse", "clinical-team"])
if not roles.exists():
    print(f"No doctor/nurse roles found, roles are: {[r.code for r in IdentityRole.objects.all()]}")

users = IdentityUser.objects.filter(identityuserrole__role__in=roles).distinct()

for user in users:
    IdentityUserGroup.objects.filter(user=user).delete()
    IdentityUserGroup.objects.create(user=user, group=group)
    print(f"Assigned {user.username} to clinical-security")

print(f"Done. Assigned {users.count()} users.")
