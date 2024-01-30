from typing import Any, Dict
from rtmis.settings import WEBDOMAIN
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from api.v1.v1_forms.models import Forms
from drf_spectacular.types import OpenApiTypes
from api.v1.v1_mobile.authentication import MobileAssignmentToken
from api.v1.v1_profile.models import Administration, Levels, Entity
from utils.custom_serializer_fields import CustomCharField
from api.v1.v1_mobile.models import MobileAssignment, MobileApk
from utils.custom_helper import CustomPasscode, generate_random_string


class MobileDataPointDownloadListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    url = serializers.SerializerMethodField()

    @extend_schema_field(OpenApiTypes.URI)
    def get_url(self, obj):
        return f"{WEBDOMAIN}/datapoints/{obj.get('uuid')}.json"

    class Meta:
        fields = ["id", "name", "url"]


class MobileAssignmentAdministrationSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField()
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return obj.full_path_name

    class Meta:
        model = Administration
        fields = ["id", "name"]


class MobileFormSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField()
    version = serializers.CharField()
    url = serializers.SerializerMethodField()

    @extend_schema_field(OpenApiTypes.URI)
    def get_url(self, obj):
        return f"/form/{obj.id}"

    class Meta:
        model = Forms
        fields = ["id", "version", "url"]


class MobileAssignmentFormsSerializer(serializers.Serializer):
    code = CustomCharField(max_length=255, write_only=True)
    name = serializers.CharField(read_only=True)
    syncToken = serializers.SerializerMethodField()
    formsUrl = serializers.SerializerMethodField()
    administrations = serializers.SerializerMethodField()

    @extend_schema_field(MobileFormSerializer(many=True))
    def get_formsUrl(self, obj):
        return MobileFormSerializer(obj.forms.all(), many=True).data

    @extend_schema_field(MobileAssignmentAdministrationSerializer(many=True))
    def get_administrations(self, obj):
        lowest_level = Levels.objects.order_by("-level").first()
        all_lowest_levels = []
        for adm in obj.administrations.all():
            if adm.level == lowest_level:
                all_lowest_levels.append(adm)
                continue
            administration = Administration.objects.filter(
                path__startswith=adm.path,
                level=lowest_level,
            ).all()
            all_lowest_levels.extend(administration)
        return MobileAssignmentAdministrationSerializer(
            all_lowest_levels, many=True
        ).data

    def get_syncToken(self, obj):
        return str(MobileAssignmentToken.for_assignment(obj))

    def validate_code(self, value):
        passcode = CustomPasscode().encode(value)
        if not MobileAssignment.objects.filter(passcode=passcode).exists():
            raise serializers.ValidationError("Invalid passcode")
        return value

    class Meta:
        fields = ["name", "syncToken", "formsUrl", "code", "administrations"]


class IdAndNameRelatedField(serializers.PrimaryKeyRelatedField):
    def use_pk_only_optimization(self) -> bool:
        return False

    def to_representation(self, value):
        return {
            "id": value.pk,
            "name": value.name,
        }


class FormsAndEntityValidation(serializers.PrimaryKeyRelatedField):
    def use_pk_only_optimization(self) -> bool:
        return False

    def to_representation(self, value):
        return {
            "id": value.pk,
            "name": value.name,
        }

    def get_queryset(self):
        queryset = super().get_queryset()
        request = self.context.get('request')
        selected_adm = request.data.get("administrations") if request else None
        selected_forms = request.data.get("forms") if request else None
        entity_forms = queryset.filter(
            pk__in=selected_forms,
            form_questions__extra__icontains="entity"
        ).distinct()
        if entity_forms.exists():
            forms = entity_forms.all()
            no_data = []
            for f in forms:
                questions = f.form_questions.filter(extra__icontains="entity")
                for q in questions:
                    entity = Entity.objects.filter(
                        name=q.extra.get("name")
                    ).first()
                    if not entity:
                        raise serializers.ValidationError(
                            f"{q.extra.get('name')} doesn't exist"
                        )
                    if entity and selected_adm:
                        entity_has_data = entity.entity_data.filter(
                            administration__in=selected_adm
                        )
                        if not entity_has_data.exists():
                            no_data.append({
                                "form": f.name,
                                "entity": entity.name,
                            })
            if len(no_data) > 0:
                raise serializers.ValidationError(no_data)

        return queryset


class MobileAssignmentSerializer(serializers.ModelSerializer):
    forms = FormsAndEntityValidation(queryset=Forms.objects.all(), many=True)
    administrations = IdAndNameRelatedField(
        queryset=Administration.objects.all(), many=True
    )
    passcode = serializers.SerializerMethodField()

    class Meta:
        model = MobileAssignment
        fields = ["id", "name", "passcode", "forms", "administrations"]
        read_only_fields = ["passcode"]

    def create(self, validated_data: Dict[str, Any]):
        user = self.context.get("request").user
        passcode = CustomPasscode().encode(generate_random_string(8))
        validated_data.update({
            "user": user,
            "passcode": passcode
        })
        return super().create(validated_data)

    def get_passcode(self, obj):
        return CustomPasscode().decode(obj.passcode)


class MobileApkSerializer(serializers.Serializer):
    apk_version = serializers.CharField(max_length=50)
    apk_url = serializers.CharField(max_length=255)
    created_at = serializers.DateTimeField(read_only=True)

    def create(self, validated_data):
        return MobileApk.objects.create(**validated_data)

    class Meta:
        model = MobileApk
        fields = ["apk_version", "apk_url", "created_at"]
