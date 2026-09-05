from django.contrib.auth.models import Group
from rest_framework import serializers

from .models import CompanyInfo, EmailTemplate, Menu, MenuSub, SystemSetting


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ["id", "name"]


class SystemSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemSetting
        fields = '__all__'


class CompanyInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyInfo
        fields = '__all__'


class EmailTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailTemplate
        fields = '__all__'


class MenuSerializer(serializers.ModelSerializer):
    groups = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), many=True, required=False
    )
    group_names = serializers.SerializerMethodField()

    class Meta:
        model = Menu
        fields = ["id", "name", "icon", "sort_order", "groups", "group_names"]

    def get_group_names(self, obj):
        return [group.name for group in obj.groups.all()]


class MenuSubSerializer(serializers.ModelSerializer):
    menu = serializers.SlugRelatedField(slug_field="name", queryset=Menu.objects.all())
    groups = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.all(), many=True, required=False
    )
    group_names = serializers.SerializerMethodField()

    class Meta:
        model = MenuSub
        fields = [
            "id",
            "name",
            "menu",
            "value",
            "link",
            "color",
            "sort_order",
            "groups",
            "group_names",
        ]

    def get_group_names(self, obj):
        return [group.name for group in obj.groups.all()]
