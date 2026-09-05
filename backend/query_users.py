import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.core.models import IdentityUserRole
import json

roles = ['System Administrator', 'Doctor', 'Nurse', 'Lab Technician', 'Pharmacist', 'Radiologist', 'Front Desk', 'Billing Officer', 'Auditor', 'Medical Records Officer', 'Ward Manager', 'HR Officer']
res = {}
for r in roles:
  ur = IdentityUserRole.objects.filter(role__name=r).first()
  if ur:
    res[r] = {'email': ur.user.email, 'name': ur.user.display_name}
    
print(json.dumps(res, indent=2))
