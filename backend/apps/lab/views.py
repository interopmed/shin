from rest_framework import viewsets
from rest_framework.response import Response
import json
import re
from datetime import datetime
from rest_framework.decorators import action
from django.db.models import Q
from apps.finance.models import Payment
from apps.core.permissions import RequirePermission
from .models import (
    LabCategory, LabTestDefinition, LabOrder, LabResult,
    Lab, LabTestValue, LabSubcategory, LabSection
)
from apps.patients.models import Patient
from apps.doctors.models import Doctor
from apps.patients.models import PatientMaterial
from .serializers import (
    LabCategorySerializer, 
    LabTestDefinitionSerializer, 
    LabSubcategorySerializer,
    LabSectionSerializer,
    LabOrderSerializer, 
    LabResultSerializer,
    LabSerializer,
    LabTestValueSerializer
)

class LabCategoryViewSet(viewsets.ModelViewSet):
    queryset = LabCategory.objects.all()
    serializer_class = LabCategorySerializer

    @action(detail=True, methods=['get'], url_path='sections')
    def sections(self, request, pk=None):
        sections = LabSection.objects.filter(category=pk).order_by('section', 'id')
        serializer = LabSectionSerializer(sections, many=True)
        return Response(serializer.data)

class LabTestDefinitionViewSet(viewsets.ModelViewSet):
    queryset = LabSubcategory.objects.all()
    serializer_class = LabSubcategorySerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset.order_by('section', 'id')

class LabOrderViewSet(viewsets.ModelViewSet):
    """ViewSet for lab orders (imported lab table data)"""
    queryset = Lab.objects.all()
    serializer_class = LabSerializer

    def _resolve_category_name(self, category_value):
        if category_value is None:
            return None

        raw = str(category_value).strip()
        if not raw:
            return None

        if re.fullmatch(r"\d+", raw):
            category = LabCategory.objects.filter(id=int(raw)).only('name', 'category').first()
            return category.name or category.category if category else None

        category = LabCategory.objects.filter(category=raw).only('name', 'category').first()
        if category:
            return category.name or category.category

        category = LabCategory.objects.filter(name__iexact=raw).only('name', 'category').first()
        return category.name or category.category if category else None

    def _resolve_category(self, category_value):
        if category_value is None:
            return None

        raw = str(category_value).strip()
        if not raw:
            return None

        if re.fullmatch(r"\d+", raw):
            return LabCategory.objects.filter(id=int(raw)).first()

        category = LabCategory.objects.filter(category=raw).first()
        if category:
            return category

        return LabCategory.objects.filter(name__iexact=raw).first()

    def list(self, request, *args, **kwargs):
        base_qs = self.get_queryset()
        exclude_completed = (request.query_params.get('exclude_completed') or '').strip().lower()
        if exclude_completed in {'1', 'true', 'yes'}:
            base_qs = base_qs.exclude(status='2')
        search = (request.query_params.get('search') or request.query_params.get('q') or '').strip()
        if search:
            q = Q()
            if search.isdigit():
                q |= Q(lab_order_id=int(search))
                q |= Q(patient=search)
                q |= Q(doctor=search)

            patient_ids = list(Patient.objects.filter(
                Q(name__icontains=search) | Q(phone__icontains=search)
            ).values_list('id', flat=True))
            doctor_ids = list(Doctor.objects.filter(
                Q(name__icontains=search)
            ).values_list('id', flat=True))

            if patient_ids:
                q |= Q(patient__in=[str(pid) for pid in patient_ids])
            if doctor_ids:
                q |= Q(doctor__in=[str(did) for did in doctor_ids])

            if q.children:
                base_qs = base_qs.filter(q)

        order_ids_qs = base_qs.values_list('lab_order_id', flat=True).distinct().order_by('-lab_order_id')
        page_order_ids = self.paginate_queryset(order_ids_qs)

        if page_order_ids is not None:
            order_ids = list(page_order_ids)
        else:
            order_ids = list(order_ids_qs)

        labs = base_qs.filter(lab_order_id__in=order_ids).order_by('-lab_order_id', '-date_string')

        order_id_strings = [str(x) for x in order_ids]
        payment_status_map = {}
        payment_id_map = {}
        payment_invoice_map = {}
        payments = Payment.objects.filter(
            Q(id__in=order_ids) | Q(invoice_id__in=order_id_strings)
        ).only('id', 'invoice_id', 'processing_status')
        for payment in payments:
            payment_status_map[payment.id] = payment.processing_status
            payment_id_map[payment.id] = payment.id
            payment_invoice_map[payment.id] = payment.invoice_id
            if payment.invoice_id and payment.invoice_id.isdigit():
                inv_id = int(payment.invoice_id)
                payment_status_map[inv_id] = payment.processing_status
                payment_id_map[inv_id] = payment.id
                payment_invoice_map[inv_id] = payment.invoice_id
        status_labels = {
            0: 'Not processing',
            1: 'Under processing',
            2: 'Completed',
            3: 'Cancel',
        }

        def extract_category_tokens(value):
            if value is None:
                return []
            if isinstance(value, str):
                raw = value.strip()
                if not raw:
                    return []
                if raw.startswith('[') or raw.startswith('{'):
                    try:
                        loaded = json.loads(raw)
                        if isinstance(loaded, list):
                            return [str(v).strip() for v in loaded if str(v).strip()]
                    except json.JSONDecodeError:
                        pass
                if ',' in raw:
                    return [v.strip() for v in raw.split(',') if v.strip()]
                return [raw]
            return [str(value).strip()]

        grouped = {}
        patient_cache = {}
        category_cache = {}

        all_tokens = []
        for lab in labs:
            all_tokens.extend(extract_category_tokens(lab.category))

        id_tokens = []
        code_tokens = []
        for token in set(all_tokens):
            if re.fullmatch(r"\d+", token):
                id_tokens.append(int(token))
            else:
                code_tokens.append(token)

        category_cache = {}
        category_id_cache = {}
        if id_tokens:
            for category in LabCategory.objects.filter(id__in=id_tokens).only('id', 'name', 'category'):
                category_cache[f"id:{category.id}"] = category.name or category.category
                category_id_cache[f"id:{category.id}"] = category.id
        if code_tokens:
            for category in LabCategory.objects.filter(category__in=code_tokens).only('id', 'category', 'name'):
                category_cache[f"code:{category.category}"] = category.name or category.category
                category_id_cache[f"code:{category.category}"] = category.id
            for category in LabCategory.objects.filter(name__in=code_tokens).only('id', 'name', 'category'):
                category_cache[f"name:{category.name}"] = category.name or category.category
                category_id_cache[f"name:{category.name}"] = category.id

        for lab in labs:
            order_id = lab.lab_order_id

            if order_id not in grouped:
                patient_name = ''
                try:
                    patient_id = int(lab.patient)
                except (TypeError, ValueError):
                    patient_id = None

                if patient_id:
                    if patient_id not in patient_cache:
                        patient = Patient.objects.filter(id=patient_id).only('name').first()
                        patient_cache[patient_id] = patient.name if patient else ''
                    patient_name = patient_cache[patient_id]

                processing_status = payment_status_map.get(order_id, 0)
                grouped[order_id] = {
                    'id': order_id,
                    'lab_order_id': order_id,
                    'payment_id': payment_id_map.get(order_id),
                    'payment_invoice_id': payment_invoice_map.get(order_id),
                    'patient_id': lab.patient,
                    'patient_name': patient_name,
                    'tests': [],
                    'test_date': lab.date_string,
                    'status': lab.status or 'Pending',
                    'processing_status': processing_status,
                    'processing_status_label': status_labels.get(processing_status, 'Not processing'),
                    '_category_tokens': set(),
                    '_test_lookup': set(),
                    '_row_count': 0,
                }

            entry = grouped[order_id]
            entry['_row_count'] += 1
            category_ids = extract_category_tokens(lab.category)

            for category_id in category_ids:
                entry['_category_tokens'].add(category_id)
                category_name = ''
                resolved_category_id = None
                if re.fullmatch(r"\d+", category_id):
                    category_name = category_cache.get(f"id:{int(category_id)}", '')
                    resolved_category_id = category_id_cache.get(f"id:{int(category_id)}")
                else:
                    category_name = (
                        category_cache.get(f"code:{category_id}", '') or
                        category_cache.get(f"name:{category_id}", '')
                    )
                    resolved_category_id = (
                        category_id_cache.get(f"code:{category_id}") or
                        category_id_cache.get(f"name:{category_id}")
                    )

                if not category_name:
                    category = LabCategory.objects.filter(category__iexact=category_id).only('id', 'name', 'category').first()
                    if not category:
                        category = LabCategory.objects.filter(name__iexact=category_id).only('id', 'name', 'category').first()
                    if category:
                        category_name = category.name or category.category
                        resolved_category_id = category.id

                display_name = category_name or category_id
                test_key = f"{lab.id}:{display_name}"
                if test_key not in entry['_test_lookup']:
                    entry['_test_lookup'].add(test_key)
                    entry['tests'].append({
                        'name': display_name,
                        'lab_id': lab.id,
                        'category_id': resolved_category_id or category_id,
                    })

        result = []
        for order_id in order_ids:
            entry = grouped.get(order_id)
            if not entry:
                continue
            entry['category_count'] = max(len(entry['_category_tokens']), entry['_row_count'])
            entry.pop('_category_tokens', None)
            entry.pop('_test_lookup', None)
            entry.pop('_row_count', None)
            result.append(entry)

        if page_order_ids is not None:
            return self.get_paginated_response(result)

        return Response(result)

    @action(detail=False, methods=['get'], url_path='order/(?P<order_id>[^/.]+)/categories')
    def order_categories(self, request, order_id=None):
        labs = self.get_queryset().filter(lab_order_id=order_id).order_by('id')
        if not labs:
            return Response({
                'lab_order_id': order_id,
                'patient_id': None,
                'patient_name': '',
                'patient_age': '',
                'doctor_name': '',
                'billing_number': '',
                'clinical_history': '',
                'collected_time_string': None,
                'received_time_string': None,
                'tests': []
            })

        first = labs[0]
        try:
            patient_id = int(first.patient)
        except (TypeError, ValueError):
            patient_id = None

        def _compute_age(patient_obj):
            if not patient_obj:
                return ''
            if getattr(patient_obj, 'age', None):
                return getattr(patient_obj, 'age')

            date_candidates = [
                getattr(patient_obj, 'ebirthdate', ''),
                getattr(patient_obj, 'birthdate', ''),
            ]
            date_formats = ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y']

            for date_value in date_candidates:
                if not date_value:
                    continue
                for fmt in date_formats:
                    try:
                        birth_date = datetime.strptime(date_value, fmt).date()
                    except (ValueError, TypeError):
                        continue
                    today = datetime.today().date()
                    years = today.year - birth_date.year
                    if (today.month, today.day) < (birth_date.month, birth_date.day):
                        years -= 1
                    return years

            return ''

        patient_name = ''
        patient_age = ''
        if patient_id:
            patient = Patient.objects.filter(id=patient_id).only('name').first()
            patient_name = patient.name if patient else ''
            if patient:
                patient_age = _compute_age(patient)

        doctor_name = ''
        payment = None
        try:
            payment = Payment.objects.select_related('doctor').filter(
                Q(id=order_id) | Q(invoice_id=str(order_id))
            ).first()
        except Exception:
            payment = None

        if payment and payment.doctor:
            doctor_name = payment.doctor.name
        elif labs and labs[0].doctor and labs[0].doctor != 'self_request':
            doctor = Doctor.objects.filter(id=labs[0].doctor).select_related('employee').first()
            doctor_name = doctor.name if doctor else ''

        billing_number = ''
        clinical_history = ''
        collected_time_string = None
        received_time_string = None

        if payment:
            billing_number = payment.invoice_id or payment.reference_number or ''
            clinical_history = payment.clinical_history or ''
            collected_time_string = payment.collected_time_string
            received_time_string = payment.received_time_string

        if not clinical_history:
            clinical_history = labs[0].clinical_history or ''
        if not collected_time_string:
            collected_time_string = labs[0].collected_time_string
        if not received_time_string:
            received_time_string = labs[0].received_time_string

        tests = []
        for lab in labs:
            category = self._resolve_category(lab.category)
            category_name = category.name or category.category if category else (self._resolve_category_name(lab.category) or '')
            tests.append({
                'lab_id': lab.id,
                'category_id': category.id if category else lab.category,
                'category_name': category_name,
                'status': lab.status or 'Pending',
                'test_date': lab.date_string,
            })

        return Response({
            'lab_order_id': order_id,
            'payment_id': payment.id if payment else None,
            'payment_invoice_id': payment.invoice_id if payment else None,
            'patient_id': patient_id,
            'patient_name': patient_name,
            'patient_age': patient_age,
            'doctor_name': doctor_name,
            'billing_number': billing_number,
            'clinical_history': clinical_history,
            'collected_time_string': collected_time_string,
            'received_time_string': received_time_string,
            'tests': tests,
        })

    def retrieve(self, request, *args, **kwargs):
        lab = self.get_object()

        lab_category = self._resolve_category(lab.category)

        try:
            patient_id = int(lab.patient)
        except (TypeError, ValueError):
            patient_id = None

        try:
            doctor_id = int(lab.doctor) if lab.doctor != 'self_request' else None
        except (TypeError, ValueError):
            doctor_id = None

        patient = Patient.objects.filter(id=patient_id).first() if patient_id else None

        payment_candidates = [lab.lab_order_id]
        payment = Payment.objects.select_related('doctor').filter(
            Q(id__in=payment_candidates) | Q(invoice_id__in=[str(x) for x in payment_candidates])
        ).first()

        if payment and payment.doctor:
            doctor = payment.doctor
            doctor_id = doctor.id
        else:
            doctor = Doctor.objects.filter(id=doctor_id).first() if doctor_id else None
            doctor_id = doctor.id if doctor else None

        def _compute_age(patient_obj):
            if not patient_obj:
                return ''
            if getattr(patient_obj, 'age', None):
                return getattr(patient_obj, 'age')

            date_candidates = [
                getattr(patient_obj, 'ebirthdate', ''),
                getattr(patient_obj, 'birthdate', ''),
            ]
            date_formats = ['%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y', '%d/%m/%Y']

            for date_value in date_candidates:
                if not date_value:
                    continue
                for fmt in date_formats:
                    try:
                        birth_date = datetime.strptime(date_value, fmt).date()
                    except (ValueError, TypeError):
                        continue
                    today = datetime.today().date()
                    years = today.year - birth_date.year
                    if (today.month, today.day) < (birth_date.month, birth_date.day):
                        years -= 1
                    return years

            return ''

        category_name = ''
        category_department = ''
        processing_method = ''
        separate_ref = False
        subcategory_status = False

        if lab_category:
            category_name = lab_category.name or lab_category.category or ''
            category_department = lab_category.department or ''
            processing_method = lab_category.processing_method or ''
            separate_ref = bool(lab_category.separate_ref)
            subcategory_status = bool(lab_category.subcategory_status)

        payment_status = payment.processing_status if payment else 0
        status_labels = {
            0: 'Not processing',
            1: 'Under processing',
            2: 'Completed',
            3: 'Cancel',
        }

        data = {
            'id': lab.id,
            'lab_order_id': lab.lab_order_id,
            'payment_id': payment.id if payment else None,
            'category': lab_category.id if lab_category else lab.category,
            'category_name': category_name or (self._resolve_category_name(lab.category) or ''),
            'department': category_department,
            'status': lab.status or 'Pending',
            'date_string': lab.date_string,
            'patient_id': patient_id,
            'doctor_id': doctor_id,
            'doctor_name': 'SELF REQUEST' if lab.doctor == 'self_request' else (doctor.name if doctor else ''),
            'special_notes': lab.special_notes,
            'processing_method': processing_method,
            'separate_ref': separate_ref,
            'report_url': None,
            'lab_category': {
                'id': lab_category.id,
                'category': lab_category.category,
                'name': category_name,
                'department': category_department,
                'subcategory_status': subcategory_status,
                'processing_method': processing_method,
                'separate_ref': separate_ref,
            } if lab_category else None,
            'patient': {
                'id': patient.id,
                'name': patient.name,
                'age': _compute_age(patient),
                'sex': getattr(patient, 'sex', ''),
                'birthdate': getattr(patient, 'birthdate', ''),
            } if patient else None,
            'payment': {
                'id': payment.id if payment else None,
                'invoice_id': payment.invoice_id if payment else None,
                'billing_number': (payment.invoice_id or payment.reference_number) if payment else lab.lab_order_id,
                'clinical_history': (payment.clinical_history or lab.clinical_history) if payment else lab.clinical_history,
                'collected_time_string': (payment.collected_time_string or lab.collected_time_string) if payment else lab.collected_time_string,
                'received_time_string': (payment.received_time_string or lab.received_time_string) if payment else lab.received_time_string,
                'processing_status': payment_status,
                'processing_status_label': status_labels.get(payment_status, 'Not processing'),
            }
        }

        if processing_method == 'outside' and lab_category:
            unique_id = f"{lab.lab_order_id}-{lab_category.id}"
            material = PatientMaterial.objects.filter(unique_id=unique_id).only('url').first()
            if material and material.url:
                data['report_url'] = material.url

        return Response(data)

class LabResultViewSet(viewsets.ModelViewSet):
    """ViewSet for lab results (imported lab_test_value table data)"""
    queryset = LabTestValue.objects.all()
    serializer_class = LabTestValueSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        order_id = request.query_params.get('order')
        if order_id:
            queryset = queryset.filter(lab_order_id=order_id)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
