from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import Max, Q
from django.contrib.auth.models import Group
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import CompanyInfo, EmailTemplate, Menu, MenuSub, SystemSetting
from .serializers import (
    CompanyInfoSerializer,
    EmailTemplateSerializer,
    GroupSerializer,
    MenuSerializer,
    MenuSubSerializer,
    SystemSettingSerializer,
)


class GroupViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Group.objects.all().order_by("name")
    serializer_class = GroupSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "id"]


class SystemSettingViewSet(viewsets.ModelViewSet):
    queryset = SystemSetting.objects.all()
    serializer_class = SystemSettingSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['key', 'description']
    ordering_fields = ['key', 'created_at']


class CompanyInfoViewSet(viewsets.ModelViewSet):
    queryset = CompanyInfo.objects.all()
    serializer_class = CompanyInfoSerializer
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'address']
    ordering_fields = ['name']


class EmailTemplateViewSet(viewsets.ModelViewSet):
    queryset = EmailTemplate.objects.all()
    serializer_class = EmailTemplateSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'subject']
    ordering_fields = ['name', 'created_at']


class MenuViewSet(viewsets.ModelViewSet):
    queryset = Menu.objects.all().prefetch_related("groups").order_by("sort_order", "id")
    serializer_class = MenuSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["id", "name", "sort_order"]

    def get_queryset(self):
        queryset = Menu.objects.all().prefetch_related("groups").order_by("sort_order", "id")
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(
                Q(groups__name__iexact=role) | Q(groups__isnull=True)
            )
        return queryset.distinct()

    def perform_create(self, serializer):
        try:
            instance = serializer.save()

            if "groups" not in serializer.validated_data and self.request.user.is_authenticated:
                instance.groups.set(self.request.user.groups.all())
        except IntegrityError as exc:
            if "menu_pkey" not in str(exc):
                raise ValidationError({"detail": f"Menu create failed: {str(exc)}"})

            data = serializer.validated_data
            next_id = (Menu.objects.aggregate(max_id=Max("id")).get("max_id") or 0) + 1
            instance = Menu.objects.create(
                id=next_id,
                name=data.get("name"),
                icon=data.get("icon", ""),
                sort_order=data.get("sort_order", next_id),
            )
            if "groups" in data:
                instance.groups.set(data.get("groups") or [])
            elif self.request.user.is_authenticated:
                instance.groups.set(self.request.user.groups.all())
            serializer.instance = instance

    def perform_update(self, serializer):
        instance = serializer.instance
        new_name = serializer.validated_data.get("name", instance.name)

        if new_name != instance.name and instance.sub_menus.exists():
            if Menu.objects.exclude(pk=instance.pk).filter(name=new_name).exists():
                raise ValidationError({"name": "A menu with this name already exists."})

            new_icon = serializer.validated_data.get("icon", instance.icon)
            new_sort_order = serializer.validated_data.get("sort_order", instance.sort_order)
            provided_groups = serializer.validated_data.get("groups", None)

            try:
                with transaction.atomic():
                    next_id = (Menu.objects.aggregate(max_id=Max("id")).get("max_id") or 0) + 1
                    replacement_menu = Menu.objects.create(
                        id=next_id,
                        name=new_name,
                        icon=new_icon,
                        sort_order=new_sort_order,
                    )

                    if provided_groups is not None:
                        replacement_menu.groups.set(provided_groups)
                    else:
                        replacement_menu.groups.set(instance.groups.all())

                    MenuSub.objects.filter(menu_id=instance.name).update(menu_id=new_name)

                    if MenuSub.objects.filter(menu_id=instance.name).exists():
                        raise IntegrityError("Some submenu rows still reference the old menu name")

                    instance.delete()
            except IntegrityError as exc:
                raise ValidationError({
                    "detail": f"Menu rename failed: {str(exc)}"
                })

            serializer.instance = replacement_menu
            return

        try:
            serializer.save()
        except IntegrityError:
            raise ValidationError({
                "detail": "Menu update failed due to related submenu records."
            })

    def perform_destroy(self, instance):
        try:
            instance.sub_menus.all().delete()
            instance.delete()
        except IntegrityError:
            raise ValidationError({
                "detail": "Menu delete failed due to related submenu records."
            })


class MenuSubViewSet(viewsets.ModelViewSet):
    queryset = MenuSub.objects.select_related("menu").prefetch_related("groups").order_by("sort_order", "id")
    serializer_class = MenuSubSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ["name", "menu__name", "link"]
    ordering_fields = ["id", "name", "sort_order"]

    def get_queryset(self):
        queryset = MenuSub.objects.select_related("menu").prefetch_related("groups").order_by("sort_order", "id")
        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(
                Q(groups__name__iexact=role) | Q(groups__isnull=True)
            )
        menu_name = self.request.query_params.get("menu")
        if menu_name:
            queryset = queryset.filter(menu__name=menu_name)
        return queryset.distinct()

    def perform_create(self, serializer):
        try:
            instance = serializer.save()

            if "groups" not in serializer.validated_data:
                instance.groups.set(instance.menu.groups.all())
        except IntegrityError as exc:
            if "menu_sub_pkey" not in str(exc):
                raise ValidationError({"detail": f"Submenu create failed: {str(exc)}"})

            data = serializer.validated_data
            next_id = (MenuSub.objects.aggregate(max_id=Max("id")).get("max_id") or 0) + 1
            instance = MenuSub.objects.create(
                id=next_id,
                name=data.get("name"),
                menu=data.get("menu"),
                value=data.get("value", ""),
                link=data.get("link", ""),
                color=data.get("color", ""),
                sort_order=data.get("sort_order", next_id),
            )
            if "groups" in data:
                instance.groups.set(data.get("groups") or [])
            else:
                instance.groups.set(instance.menu.groups.all())
            serializer.instance = instance
