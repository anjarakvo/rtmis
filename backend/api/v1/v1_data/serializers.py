from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from api.v1.v1_data.constants import DataApprovalStatus
from api.v1.v1_data.models import FormData, Answers, PendingFormData, \
    PendingAnswers
from api.v1.v1_forms.constants import QuestionTypes
from api.v1.v1_forms.models import Questions, QuestionOptions
from api.v1.v1_profile.constants import UserRoleTypes
from api.v1.v1_profile.models import Administration
from api.v1.v1_users.models import SystemUser
from utils.custom_serializer_fields import CustomPrimaryKeyRelatedField, \
    UnvalidatedField, CustomListField, CustomCharField
from utils.functions import update_date_time_format, get_answer_value


class SubmitFormDataSerializer(serializers.ModelSerializer):
    administration = CustomPrimaryKeyRelatedField(
        queryset=Administration.objects.none())
    name = CustomCharField()

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fields.get(
            'administration').queryset = Administration.objects.all()

    class Meta:
        model = FormData
        fields = ['name', 'geo', 'administration']


class SubmitFormDataAnswerSerializer(serializers.ModelSerializer):
    value = UnvalidatedField(allow_null=False)
    question = CustomPrimaryKeyRelatedField(queryset=Questions.objects.none())

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fields.get(
            'question').queryset = Questions.objects.all()

    def validate_value(self, value):
        return value

    def validate(self, attrs):
        if attrs.get('value') == '':
            raise ValidationError('Value is required for Question:{0}'.format(
                attrs.get('question').id))

        if isinstance(attrs.get('value'), list) and len(
                attrs.get('value')) == 0:
            raise ValidationError('Value is required for Question:{0}'.format(
                attrs.get('question').id))

        if not isinstance(attrs.get('value'), list) and attrs.get(
                'question').type in [QuestionTypes.geo,
                                     QuestionTypes.option,
                                     QuestionTypes.multiple_option]:
            raise ValidationError(
                'Valid list value is required for Question:{0}'.format(
                    attrs.get('question').id))
        elif not isinstance(attrs.get('value'), str) and attrs.get(
                'question').type in [QuestionTypes.text,
                                     QuestionTypes.photo,
                                     QuestionTypes.date]:
            raise ValidationError(
                'Valid string value is required for Question:{0}'.format(
                    attrs.get('question').id))

        elif not isinstance(attrs.get('value'), int) and attrs.get(
                'question').type in [QuestionTypes.number,
                                     QuestionTypes.administration]:

            raise ValidationError(
                'Valid number value is required for Question:{0}'.format(
                    attrs.get('question').id))

        return attrs

    class Meta:
        model = Answers
        fields = ['question', 'value']


class SubmitFormSerializer(serializers.Serializer):
    data = SubmitFormDataSerializer()
    answer = SubmitFormDataAnswerSerializer(many=True)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    def update(self, instance, validated_data):
        pass

    def create(self, validated_data):
        data = validated_data.get('data')
        data['form'] = self.context.get('form')
        data['created_by'] = self.context.get('user')
        data['updated_by'] = self.context.get('user')
        obj_data = self.fields.get('data').create(data)

        """
        Answer value based on Question type
        -geo = 1 #option
        -administration = 2 #value
        -text = 3 #name
        -number = 4 #value
        -option = 5 #option
        -multiple_option = 6 #option
        -cascade = 7 #option
        -photo = 8 #name
        -date = 9 #name
        """

        for answer in validated_data.get('answer'):
            name = None
            value = None
            option = None

            if answer.get('question').type in [QuestionTypes.geo,
                                               QuestionTypes.option,
                                               QuestionTypes.multiple_option]:
                option = answer.get('value')
            elif answer.get('question').type in [QuestionTypes.text,
                                                 QuestionTypes.photo,
                                                 QuestionTypes.date]:
                name = answer.get('value')
            else:
                # for administration,number question type
                value = answer.get('value')

            Answers.objects.create(
                data=obj_data,
                question=answer.get('question'),
                name=name,
                value=value,
                options=option,
                created_by=self.context.get('user'),
            )
        return object


class ListDataAnswerSerializer(serializers.ModelSerializer):
    history = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()

    def get_history(self, instance):
        return False

    def get_value(self, instance: Answers):
        return get_answer_value(instance)

    class Meta:
        model = Answers
        fields = ['history', 'question', 'value']


class ListFormDataRequestSerializer(serializers.Serializer):
    administration = CustomPrimaryKeyRelatedField(
        queryset=Administration.objects.none(), required=False)
    questions = CustomListField(child=CustomPrimaryKeyRelatedField(
        queryset=Questions.objects.none()), required=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fields.get(
            'administration').queryset = Administration.objects.all()
        self.fields.get(
            'questions').child.queryset = Questions.objects.all()


class ListFormDataSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    updated_by = serializers.SerializerMethodField()
    created = serializers.SerializerMethodField()
    updated = serializers.SerializerMethodField()
    administration = serializers.ReadOnlyField(source='administration.name')

    # answer = serializers.SerializerMethodField()

    def get_created_by(self, instance: FormData):
        return instance.created_by.get_full_name()

    def get_updated_by(self, instance: FormData):
        if instance.updated_by:
            return instance.updated_by.get_full_name()
        return None

    def get_created(self, instance: FormData):
        return update_date_time_format(instance.created)

    def get_updated(self, instance: FormData):
        return update_date_time_format(instance.updated)

    #
    # @extend_schema_field(ListDataAnswerSerializer(many=True))
    # def get_answer(self, instance: FormData):
    #     filter_data = {}
    #     if self.context.get('questions') and len(
    #             self.context.get('questions')):
    #         filter_data['question__in'] = self.context.get('questions')
    #     return ListDataAnswerSerializer(
    #         instance=instance.data_answer.filter(**filter_data),
    #         many=True).data

    class Meta:
        model = FormData
        fields = ['id', 'name', 'form', 'administration', 'geo', 'created_by',
                  'updated_by', 'created', 'updated']


class ListMapDataPointRequestSerializer(serializers.Serializer):
    marker = CustomPrimaryKeyRelatedField(queryset=Questions.objects.none(),
                                          required=False)
    shape = CustomPrimaryKeyRelatedField(queryset=Questions.objects.none())

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        queryset = self.context.get('form').form_questions.all()
        self.fields.get('marker').queryset = queryset
        self.fields.get('shape').queryset = queryset


class ListMapDataPointSerializer(serializers.ModelSerializer):
    marker = serializers.SerializerMethodField()
    shape = serializers.SerializerMethodField()

    def get_marker(self, instance):
        if self.context.get('marker'):
            return get_answer_value(
                instance.data_answer.get(question=self.context.get('marker')))
        return None

    def get_shape(self, instance: FormData):
        return get_answer_value(
            instance.data_answer.get(question=self.context.get('shape')))

    class Meta:
        model = FormData
        fields = ['id', 'name', 'geo', 'marker', 'shape']


class ListChartDataPointRequestSerializer(serializers.Serializer):
    stack = CustomPrimaryKeyRelatedField(queryset=Questions.objects.none(),
                                         required=False)
    question = CustomPrimaryKeyRelatedField(queryset=Questions.objects.none())

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        queryset = self.context.get('form').form_questions.filter(
            type=QuestionTypes.option)
        self.fields.get('question').queryset = queryset
        self.fields.get('stack').queryset = queryset


class ListChartQuestionDataPointSerializer(serializers.ModelSerializer):
    value = serializers.SerializerMethodField()

    def get_value(self, instance: QuestionOptions):
        return instance.question.question_answer.filter(
            options__contains=instance.name).count()

    class Meta:
        model = QuestionOptions
        fields = ['name', 'value']


class ListPendingFormDataRequestSerializer(serializers.Serializer):
    administration = CustomPrimaryKeyRelatedField(
        queryset=Administration.objects.none(), required=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.fields.get(
            'administration').queryset = Administration.objects.all()


class ListPendingDataAnswerSerializer(serializers.ModelSerializer):
    history = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()

    def get_history(self, instance):
        return False

    def get_value(self, instance: Answers):
        return get_answer_value(instance)

    class Meta:
        model = PendingAnswers
        fields = ['history', 'question', 'value']


class ListPendingFormDataSerializer(serializers.ModelSerializer):
    created_by = serializers.SerializerMethodField()
    created = serializers.SerializerMethodField()
    administration = serializers.ReadOnlyField(source='administration.name')
    # answer = serializers.SerializerMethodField()
    approver = serializers.SerializerMethodField()

    def get_created_by(self, instance: PendingFormData):
        return instance.created_by.get_full_name()

    def get_created(self, instance: PendingFormData):
        return update_date_time_format(instance.created)

    # @extend_schema_field(ListPendingDataAnswerSerializer(many=True))
    # def get_answer(self, instance: PendingFormData):
    #     filter_data = {}
    #     if self.context.get('questions') and len(
    #             self.context.get('questions')):
    #         filter_data['question__in'] = self.context.get('questions')
    #     return ListPendingDataAnswerSerializer(
    #         instance=instance.pending_data_answer.filter(**filter_data),
    #         many=True).data

    def get_approver(self, instance: PendingFormData):
        user: SystemUser = self.context.get('user')
        data = {}
        if user.user_access.role == UserRoleTypes.admin:
            approval = instance.pending_data_form_approval.order_by(
                'level__level').first()
            data['name'] = approval.user.get_full_name()
            data['status'] = approval.status
            data['status_text'] = DataApprovalStatus.FieldStr.get(
                approval.status)
            data['allow_approve'] = False

        else:
            if len(self.context.get('descendants')) == 0:
                data['name'] = user.get_full_name()
                approval = instance.pending_data_form_approval.get(user=user)
                data['status'] = approval.status
                data['status_text'] = DataApprovalStatus.FieldStr.get(
                    approval.status)
                data['allow_approve'] = True
            else:
                level = user.user_access.administration.level
                approval = instance.pending_data_form_approval.filter(
                    level__level__gt=level.level).order_by(
                    'level__level').first()
                data['name'] = approval.user.get_full_name()
                data['status'] = approval.status
                data['status_text'] = DataApprovalStatus.FieldStr.get(
                    approval.status)
                if approval.status == DataApprovalStatus.approved:
                    data['allow_approve'] = True
                else:
                    data['allow_approve'] = False

        return data

    class Meta:
        model = PendingFormData
        fields = ['id', 'name', 'form', 'administration', 'geo', 'created_by',
                  'created', 'approver']
