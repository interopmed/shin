from rest_framework.permissions import BasePermission
from apps.core.models import PatientUnitAssignment, PatientReferral

class UnitScopedPatientAccess(BasePermission):
    """
    HIPAA-compliant data-scope permission class.
    Ensures that a user can only access patients within their assigned unit(s)
    (e.g., OPD, ETU, Ward, Lab) or patients explicitly referred to them.
    """

    def has_object_permission(self, request, view, patient):
        user_data = request.auth.get("user", {}) if isinstance(request.auth, dict) else {}
        scope = user_data.get("scope", {})
        
        employee_id = scope.get("employee_id")
        unit_ids = scope.get("unit_ids", [])

        # If user has no employee profile, they have no clinical scope. Deny.
        if not employee_id:
            return False

        # 1. Check direct unit assignment
        if unit_ids and PatientUnitAssignment.objects.filter(
            patient=patient, unit_id__in=unit_ids, is_current=True
        ).exists():
            return True

        # 2. Check referral access
        if PatientReferral.objects.filter(
            patient=patient,
            referred_to_employee_id=employee_id,
            is_active=True
        ).exists():
            return True

        return False

class HasFacilityManagePermission(BasePermission):
    """
    Requires the user to have 'facility.manage' or 'module.manage' permission
    in order to modify ServiceUnits. Read access (GET) is allowed for any authenticated user.
    """
    def has_permission(self, request, view):
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return True
            
        user_data = request.auth.get("user", {}) if isinstance(request.auth, dict) else {}
        permissions = user_data.get("permissions", [])
        
        return "facility.manage" in permissions or "module.manage" in permissions


class RequirePermission(BasePermission):
    """
    Checks if the user's JWT token payload contains the specific permission string.
    """
    def __init__(self, required_permission):
        self.required_permission = required_permission

    def __call__(self):
        # Allow use as a class factory in decorators
        return self

    def has_permission(self, request, view):
        user_data = request.auth.get("user", {}) if isinstance(request.auth, dict) else {}
        permissions = user_data.get("permissions", [])
        return self.required_permission in permissions


class RequireAnyPermission(BasePermission):
    """
    Checks if the user's JWT token payload contains ANY of the provided permission strings.
    """
    def __init__(self, required_permissions):
        self.required_permissions = required_permissions

    def __call__(self):
        return self

    def has_permission(self, request, view):
        user_data = request.auth.get("user", {}) if isinstance(request.auth, dict) else {}
        permissions = user_data.get("permissions", [])
        return any(p in permissions for p in self.required_permissions)
