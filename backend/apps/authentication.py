from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from apps.core.rbac import get_permissions_for_role

User = get_user_model()


def get_identity_role(username: str) -> str:
    """
    Look up the user's role from identity_user → identity_user_role → identity_role.
    Falls back to 'Admin' for superusers, 'User' if no role is found.
    """
    try:
        from apps.core.models import IdentityUser, IdentityUserRole
        identity_user = IdentityUser.objects.get(username=username)
        user_role = (
            IdentityUserRole.objects
            .filter(user=identity_user)
            .select_related('role')
            .first()
        )
        if user_role:
            return user_role.role.name  # e.g. "Nurse", "Doctor", "Admin"
    except Exception:
        pass
    return None

def get_scope(username: str) -> dict:
    """
    Fetch the user's unit assignments and department.
    """
    try:
        from apps.core.models import IdentityUser, ServiceUnitStaff
        identity_user = IdentityUser.objects.get(username=username)
        employee = identity_user.employee_profiles.first()
        if employee:
            unit_ids = list(
                ServiceUnitStaff.objects
                .filter(employee=employee, assigned_until__isnull=True)
                .values_list('unit_id', flat=True)
            )
            return {
                "unit_ids": unit_ids,
                "department": employee.department,
                "employee_id": employee.id,
            }
    except Exception:
        pass
    return {"unit_ids": [], "department": None, "employee_id": None}



class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom serializer to allow login with email instead of username.
    Returns the user's actual role from the identity tables.
    """
    email = serializers.EmailField(required=False)

    default_error_messages = {
        'no_active_account': 'Invalid email or password'
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'] = serializers.CharField(required=False)

    def validate(self, attrs):
        email = attrs.get('email')
        username = attrs.get('username')

        if not email and not username:
            raise serializers.ValidationError({'detail': 'Email or username is required'})

        if email and not username:
            try:
                user = User.objects.get(email=email)
                attrs['username'] = user.username
            except User.DoesNotExist:
                attrs['username'] = email

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            raise AuthenticationFailed({'detail': 'Invalid email or password'})

        # Look up the actual role from the identity tables
        identity_role = get_identity_role(self.user.username)

        # Fall back to superuser check if no identity role found
        if not identity_role:
            identity_role = 'Admin' if self.user.is_superuser else 'User'

        # Fetch unit and department scope
        scope = get_scope(self.user.username)
        
        # Get permissions
        permissions = get_permissions_for_role(identity_role)

        data['user'] = {
            'id': self.user.id,
            'username': self.user.username,
            'email': self.user.email,
            'role': identity_role,
            'scope': scope,
            'permissions': permissions,
        }

        return data


class EmailTokenObtainPairView(TokenObtainPairView):
    """
    View that uses email-based authentication
    """
    serializer_class = EmailTokenObtainPairSerializer
