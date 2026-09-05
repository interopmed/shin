from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Department, Employee, Attendance, Leave, Designation


class DepartmentSerializer(serializers.ModelSerializer):
    head_name = serializers.CharField(source='head.get_full_name', read_only=True)
    
    class Meta:
        model = Department
        fields = '__all__'


from apps.core.models import Employee as CoreEmployee

class DesignationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Designation
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    designation_name = serializers.CharField(source='designation.name', read_only=True)
    facilities = serializers.SerializerMethodField()
    service_units = serializers.SerializerMethodField()
    id = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = '__all__'

    def get_id(self, obj):
        from django.utils.text import slugify
        name = obj.user.get_full_name() if obj.user else ""
        slug = slugify(name)
        return f"{obj.id}-{slug}" if slug else str(obj.id)

    def get_facilities(self, obj):
        try:
            core_emp = CoreEmployee.objects.get(id=obj.id)
            if core_emp.facility:
                return core_emp.facility
            facilities = set()
            for assignment in core_emp.unit_assignments.select_related('unit__facility'):
                if assignment.unit and assignment.unit.facility:
                    facilities.add(assignment.unit.facility.name)
            return ", ".join(facilities) if facilities else "-"
        except CoreEmployee.DoesNotExist:
            return "-"

    def get_service_units(self, obj):
        try:
            core_emp = CoreEmployee.objects.get(id=obj.id)
            units = [assignment.unit.name for assignment in core_emp.unit_assignments.select_related('unit') if assignment.unit]
            return ", ".join(units) if units else "-"
        except CoreEmployee.DoesNotExist:
            return "-"


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    
    class Meta:
        model = Attendance
        fields = '__all__'


class LeaveSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    employee_id = serializers.CharField(source='employee.employee_id', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = Leave
        fields = '__all__'


class UserLookupSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_active', 'full_name']

    def get_full_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.username
