from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.models import User
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from datetime import date
from .models import Department, Employee, Attendance, Leave, Designation
from .serializers import DepartmentSerializer, EmployeeSerializer, AttendanceSerializer, LeaveSerializer, UserLookupSerializer, DesignationSerializer


class DesignationViewSet(viewsets.ModelViewSet):
    queryset = Designation.objects.all()
    serializer_class = DesignationSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class DepartmentViewSet(viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('user', 'department').all()
    serializer_class = EmployeeSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['department', 'employment_type', 'is_active']
    search_fields = ['employee_id', 'user__first_name', 'user__last_name', 'designation__name']
    ordering_fields = ['employee_id', 'date_of_joining', 'created_at']

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup = self.kwargs.get(lookup_url_kwarg)
        
        if lookup and isinstance(lookup, str) and "-" in lookup:
            self.kwargs[lookup_url_kwarg] = lookup.split("-")[0]
            
        return super().get_object()

    def get_queryset(self):
        qs = super().get_queryset()
        facility = self.request.query_params.get('facility')
        unit = self.request.query_params.get('unit')
        
        if facility or unit:
            from apps.core.models import Employee as CoreEmployee
            core_qs = CoreEmployee.objects.all()
            if facility:
                core_qs = core_qs.filter(unit_assignments__unit__facility_id=facility)
            if unit:
                core_qs = core_qs.filter(unit_assignments__unit_id=unit)
            
            core_emps = core_qs.values_list('id', flat=True)
            qs = qs.filter(id__in=core_emps)
        return qs
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active employees"""
        active_employees = self.queryset.filter(is_active=True)
        serializer = self.get_serializer(active_employees, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def units(self, request, pk=None):
        employee = self.get_object()
        from apps.core.models import Employee as CoreEmployee, ServiceUnitStaff, Facility
        try:
            core_emp = CoreEmployee.objects.get(id=employee.id)
        except CoreEmployee.DoesNotExist:
            if request.method == 'GET':
                return Response({"units": [], "facility": None})
            # Auto-create core employee to allow assignments
            core_emp = CoreEmployee.objects.create(
                id=employee.id,
                code=f"emp-auto-{employee.id}",
                employee_number=employee.employee_id,
                full_name=employee.user.get_full_name() if employee.user else f"Employee {employee.id}",
                job_title=employee.designation,
                employment_type=employee.employment_type,
            )

        if request.method == 'GET':
            assignments = ServiceUnitStaff.objects.filter(employee=core_emp)
            facility_id = None
            if core_emp.facility:
                fac = Facility.objects.filter(name=core_emp.facility).first()
                if fac:
                    facility_id = fac.id
            if not facility_id and assignments.exists():
                unit = assignments.first().unit
                if unit and unit.facility_id:
                    facility_id = unit.facility_id
            return Response({
                "units": [a.unit_id for a in assignments],
                "facility": facility_id
            })

        if request.method == 'POST':
            unit_ids = request.data.get('units', [])
            facility_id = request.data.get('facility')
            
            if facility_id:
                fac = Facility.objects.filter(id=facility_id).first()
                if fac:
                    core_emp.facility = fac.name
            else:
                core_emp.facility = ""
            core_emp.save()

            ServiceUnitStaff.objects.filter(employee=core_emp).delete()
            for unit_id in unit_ids:
                ServiceUnitStaff.objects.create(employee=core_emp, unit_id=unit_id)
            return Response({"status": "success"})


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related('employee__user').all()
    serializer_class = AttendanceSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'status', 'date']
    search_fields = ['employee__employee_id', 'employee__user__first_name', 'employee__user__last_name']
    ordering_fields = ['date']
    
    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's attendance"""
        today_attendance = self.queryset.filter(date=date.today())
        serializer = self.get_serializer(today_attendance, many=True)
        return Response(serializer.data)


class LeaveViewSet(viewsets.ModelViewSet):
    queryset = Leave.objects.select_related('employee__user', 'approved_by').all()
    serializer_class = LeaveSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['employee', 'leave_type', 'status']
    search_fields = ['employee__employee_id', 'employee__user__first_name', 'employee__user__last_name', 'reason']
    ordering_fields = ['start_date', 'created_at']
    
    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Get pending leave requests"""
        pending_leaves = self.queryset.filter(status='pending')
        serializer = self.get_serializer(pending_leaves, many=True)
        return Response(serializer.data)


class UserLookupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all().order_by('username')
    serializer_class = UserLookupSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['id', 'username', 'first_name', 'last_name', 'email']
