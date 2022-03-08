# Create your views here.
import datetime
from math import ceil
from wsgiref.util import FileWrapper

from django.contrib.postgres.aggregates import StringAgg
from django.core.paginator import InvalidPage, EmptyPage, Paginator
from django.db.models import Count, TextField, Value
from django.db.models.functions import Cast, Coalesce
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, inline_serializer, \
    OpenApiParameter, OpenApiResponse
from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.generics import get_object_or_404
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.v1.v1_data.models import FormData, Answers, PendingFormData, \
    PendingDataBatch
from api.v1.v1_data.serializers import SubmitFormSerializer, \
    ListFormDataSerializer, ListFormDataRequestSerializer, \
    ListDataAnswerSerializer, ListMapDataPointSerializer, \
    ListMapDataPointRequestSerializer, ListChartDataPointRequestSerializer, \
    ListChartQuestionDataPointSerializer, \
    ListPendingDataAnswerSerializer, \
    ApprovePendingDataRequestSerializer, ListBatchSerializer, \
    CreateBatchSerializer, ListPendingDataBatchSerializer, \
    ListPendingFormDataSerializer, PendingBatchDataFilterSerializer, \
    SubmitPendingFormSerializer
from api.v1.v1_forms.models import Forms
from api.v1.v1_profile.models import Administration
from api.v1.v1_users.models import SystemUser
from rtmis.settings import REST_FRAMEWORK
from utils.custom_permissions import IsAdmin, IsApprover, IsSuperAdmin
from utils.custom_serializer_fields import validate_serializers_message
from utils.export_form import generate_excel


class FormDataAddListView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={
        (200, 'application/json'):
            inline_serializer("DataList", fields={
                "current": serializers.IntegerField(),
                "total": serializers.IntegerField(),
                "total_page": serializers.IntegerField(),
                "data": ListFormDataSerializer(many=True),
            })},
        tags=['Data'],
        parameters=[
            OpenApiParameter(name='page',
                             required=True,
                             type=OpenApiTypes.NUMBER,
                             location=OpenApiParameter.QUERY),
            OpenApiParameter(name='administration',
                             required=False,
                             type=OpenApiTypes.NUMBER,
                             location=OpenApiParameter.QUERY),
            OpenApiParameter(name='questions',
                             required=False,
                             type={'type': 'array',
                                   'items': {'type': 'number'}},
                             location=OpenApiParameter.QUERY),
        ],
        summary='To get list of form data')
    def get(self, request, form_id, version):
        form = get_object_or_404(Forms, pk=form_id)
        try:
            serializer = ListFormDataRequestSerializer(data=request.GET)
            if not serializer.is_valid():
                return Response(
                    {'message': validate_serializers_message(
                        serializer.errors)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            filter_data = {}
            if serializer.validated_data.get('administration'):
                filter_administration = serializer.validated_data.get(
                    'administration')
                if filter_administration.path:
                    filter_path = '{0}{1}.'.format(filter_administration.path,
                                                   filter_administration.id)
                else:
                    filter_path = f"{filter_administration.id}."
                filter_descendants = list(Administration.objects.filter(
                    path__startswith=filter_path).values_list('id', flat=True))
                filter_descendants.append(filter_administration.id)

                filter_data['administration_id__in'] = filter_descendants

            page_size = REST_FRAMEWORK.get('PAGE_SIZE')
            page = request.GET.get('page')

            the_past = datetime.datetime.now() - datetime.timedelta(
                days=10 * 365)
            queryset = form.form_form_data.filter(**filter_data).annotate(
                last_updated=Coalesce('updated', Value(the_past))).order_by(
                '-last_updated', '-created')
            paginator_temp = Paginator(queryset, page_size)
            paginator_temp.page(request.GET.get('page', page))

            paginator = PageNumberPagination()
            instance = paginator.paginate_queryset(queryset, request)

            data = {
                "current": int(request.GET.get('page', '1')),
                "total": queryset.count(),
                "total_page": ceil(queryset.count() / page_size),
                "data": ListFormDataSerializer(
                    instance=instance, context={
                        'questions': serializer.validated_data.get(
                            'questions')},
                    many=True).data,
            }
            return Response(data, status=status.HTTP_200_OK)
        except (InvalidPage, EmptyPage):
            return Response({'message': 'data not found'},
                            status=status.HTTP_404_NOT_FOUND)
        except Exception as ex:
            return Response({'message': ex.args},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(request=SubmitFormSerializer,
                   responses={
                       (200, 'application/json'):
                           inline_serializer("FormSubmit", fields={
                               "message": serializers.CharField()
                           })
                   },
                   tags=['Data'],
                   summary='Submit form data')
    def post(self, request, form_id, version):
        form = get_object_or_404(Forms, pk=form_id)
        try:
            serializer = SubmitFormSerializer(data=request.data,
                                              context={'user': request.user,
                                                       'form': form})
            if not serializer.is_valid():
                return Response(
                    {'message': validate_serializers_message(
                        serializer.errors),
                        'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save()
            return Response({'message': 'ok'}, status=status.HTTP_200_OK)
        except Exception as ex:
            return Response({'message': ex.args},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: ListDataAnswerSerializer(many=True)},
               tags=['Data'],
               summary='To get answers for form data')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def data_answers(request, version, data_id):
    data = get_object_or_404(FormData, pk=data_id)
    try:
        return Response(
            ListDataAnswerSerializer(instance=data.data_answer.all(),
                                     many=True).data,
            status=status.HTTP_200_OK)
    except Exception as ex:
        return Response({'message': ex.args},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: ListMapDataPointSerializer(many=True)},
               parameters=[
                   OpenApiParameter(name='shape',
                                    required=True,
                                    type=OpenApiTypes.NUMBER,
                                    location=OpenApiParameter.QUERY),
                   OpenApiParameter(name='marker',
                                    required=False,
                                    type=OpenApiTypes.NUMBER,
                                    location=OpenApiParameter.QUERY),
               ],
               tags=['Visualisation'],
               summary='To get Map data points')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_map_data_point(request, version, form_id):
    instance = get_object_or_404(Forms, pk=form_id)
    try:
        serializer = ListMapDataPointRequestSerializer(data=request.GET,
                                                       context={
                                                           'form': instance})
        if not serializer.is_valid():
            return Response(
                {'message': validate_serializers_message(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST
            )
        return Response(
            ListMapDataPointSerializer(
                instance=instance.form_form_data.all(),
                context={
                    'shape': serializer.validated_data.get('shape'),
                    'marker': serializer.validated_data.get('marker')
                },
                many=True).data,
            status=status.HTTP_200_OK)
    except Exception as ex:
        return Response({'message': ex.args},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: OpenApiTypes.OBJECT},
               parameters=[
                   OpenApiParameter(name='question',
                                    required=True,
                                    type=OpenApiTypes.NUMBER,
                                    location=OpenApiParameter.QUERY),
                   OpenApiParameter(name='stack',
                                    required=False,
                                    type=OpenApiTypes.NUMBER,
                                    location=OpenApiParameter.QUERY),
               ],
               tags=['Visualisation'],
               summary='To get Chart data points')
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chart_data_point(request, version, form_id):
    instance = get_object_or_404(Forms, pk=form_id)
    try:
        serializer = ListChartDataPointRequestSerializer(data=request.GET,
                                                         context={
                                                             'form': instance
                                                         })
        if not serializer.is_valid():
            return Response(
                {'message': validate_serializers_message(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST
            )

        if serializer.validated_data.get('stack'):
            query_set = Answers.objects.filter(
                question=serializer.validated_data.get('stack')).values(
                'options').annotate(c=Count('options'),
                                    ids=StringAgg(Cast('data_id', TextField()),
                                                  delimiter=',',
                                                  output_field=TextField()))
            data = []
            for val in query_set:
                values = {
                    'group': val.get('options')[0],
                    'child': []
                }

                child_query_set = Answers.objects.filter(
                    data_id__in=val.get('ids').split(','),
                    question=serializer.validated_data.get('question')).values(
                    'options').annotate(c=Count('options'))

                for child in child_query_set:
                    values.get('child').append({
                        'name': child.get('options')[0],
                        'value': child.get('c')
                    })
                data.append(values)

            return Response({'type': 'BARSTACK', 'data': data},
                            status=status.HTTP_200_OK)

        return Response({'type': 'BAR',
                         'data': ListChartQuestionDataPointSerializer(
                             instance=serializer.validated_data.get(
                                 'question').question_question_options.all(),
                             many=True).data},
                        status=status.HTTP_200_OK)
    except Exception as ex:
        return Response({'message': ex.args},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={
    (200, 'application/json'):
        inline_serializer("DataList", fields={
            "current": serializers.IntegerField(),
            "total": serializers.IntegerField(),
            "total_page": serializers.IntegerField(),
            "data": ListPendingDataBatchSerializer(many=True),
        })},
    tags=['Pending Data'],
    parameters=[
        OpenApiParameter(name='page',
                         required=True,
                         type=OpenApiTypes.NUMBER,
                         location=OpenApiParameter.QUERY),
        OpenApiParameter(name='approved',
                         required=True,
                         default=False,
                         type=OpenApiTypes.BOOL,
                         location=OpenApiParameter.QUERY),
    ],
    summary='To get list of pending batch')
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin | IsApprover])
def list_pending_batch(request, version):
    try:
        serializer = PendingBatchDataFilterSerializer(data=request.GET)
        if not serializer.is_valid():
            return Response(
                {'message': validate_serializers_message(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST
            )
        page_size = REST_FRAMEWORK.get('PAGE_SIZE')
        batch_ids = list(
            request.user.user_assigned_pending_data.values_list('batch_id',
                                                                flat=True))
        queryset = PendingDataBatch.objects.filter(
            id__in=batch_ids,
            approved=serializer.validated_data.get('approved')
        ).order_by('-created')

        paginator_temp = Paginator(queryset, page_size)
        paginator_temp.page(request.GET.get('page', 1))

        paginator = PageNumberPagination()
        instance = paginator.paginate_queryset(queryset, request)

        data = {
            "current": int(request.GET.get('page', '1')),
            "total": queryset.count(),
            "total_page": ceil(queryset.count() / page_size),
            "batch": ListPendingDataBatchSerializer(
                instance=instance, context={
                    'user': request.user, },
                many=True).data,
        }
        return Response(data, status=status.HTTP_200_OK)
    except (InvalidPage, EmptyPage):
        return Response({'message': 'data not found'},
                        status=status.HTTP_404_NOT_FOUND)
    except Exception as ex:
        return Response({'message': ex.args},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(responses={200: ListPendingFormDataSerializer(many=True)},
               tags=['Pending Data'],
               summary='To get list of pending data by batch')
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin | IsApprover])
def list_pending_data_batch(request, version, batch_id):
    batch = get_object_or_404(PendingDataBatch, pk=batch_id)
    try:
        return Response(ListPendingFormDataSerializer(
            instance=batch.batch_pending_data_batch.all(), many=True
        ).data, status=status.HTTP_200_OK)
    except Exception as ex:
        return Response({'message': ex.args},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PendingDataDetailDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListPendingDataAnswerSerializer(many=True)},
                   tags=['Pending Data'],
                   summary='To get list of answers for pending data')
    def get(self, request, pending_data_id, version):
        data = get_object_or_404(PendingFormData, pk=pending_data_id)
        try:
            return Response(
                ListPendingDataAnswerSerializer(
                    instance=data.pending_data_answer.all(),
                    many=True).data,
                status=status.HTTP_200_OK)
        except Exception as ex:
            return Response({'message': ex.args},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        responses={
            204: OpenApiResponse(description='Deletion with no response')
        },
        tags=['Pending Data'],
        summary='To delete pending data')
    def delete(self, request, pending_data_id, version):
        instance = get_object_or_404(PendingFormData, pk=pending_data_id)
        if instance.created_by_id != request.user.id:
            return Response(
                {'message': 'You are not allowed to perform this action'},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(request=ApprovePendingDataRequestSerializer(),
               responses={
                   (200, 'application/json'):
                       inline_serializer("ApproveData", fields={
                           "message": serializers.CharField()
                       })},
               tags=['Pending Data'],
               summary='Approve pending data')
@api_view(['POST'])
@permission_classes([IsAuthenticated, IsApprover | IsAdmin])
def approve_pending_data(request, version):
    try:
        serializer = ApprovePendingDataRequestSerializer(
            data=request.data,
            context={'user': request.user}
        )
        if not serializer.is_valid():
            return Response(
                {'message': validate_serializers_message(serializer.errors)},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer.save()
        return Response({'message': 'Ok'},
                        status=status.HTTP_200_OK)
    except Exception as ex:
        return Response({'message': ex.args},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BatchView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses={200: ListBatchSerializer(many=True)},
                   tags=['Pending Data'],
                   summary='To get list of batch')
    def get(self, request, version):
        return Response(
            ListBatchSerializer(
                instance=PendingDataBatch.objects.filter(user=request.user),
                many=True).data,
            status=status.HTTP_200_OK)

    @extend_schema(request=CreateBatchSerializer(),
                   tags=['Pending Data'],
                   summary='To create batch')
    def post(self, request, version):
        try:
            serializer = CreateBatchSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'message': validate_serializers_message(
                        serializer.errors)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            serializer.save(user=request.user)
            return Response({'message': 'Data updated successfully'},
                            status=status.HTTP_200_OK)
        except Exception as ex:
            return Response(
                {'message': ex.args},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@extend_schema(tags=['File'],
               summary='Export Form data')
@permission_classes([IsAuthenticated])
@api_view(['GET'])
def export_form_data(request, version, form_id):
    form = get_object_or_404(Forms, pk=form_id)
    try:
        filepath = generate_excel(form=form, user=SystemUser.objects.first())
        filename = filepath.split("/")[-1].replace(" ", "-")
        zip_file = open(filepath, 'rb')
        response = HttpResponse(
            FileWrapper(zip_file),
            content_type='application/vnd.openxmlformats-officedocument'
                         '.spreadsheetml.sheet')
        response[
            'Content-Disposition'] = 'attachment; filename="%s"' % filename
        return response
    except Exception as ex:
        return Response(
            {'message': ex.args},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class PendingFormDataView(APIView):
    permission_classes = [IsAuthenticated, ~IsSuperAdmin]

    @extend_schema(request=SubmitPendingFormSerializer,
                   responses={
                       (200, 'application/json'):
                           inline_serializer("PendingFormSubmit", fields={
                               "message": serializers.CharField()
                           })
                   },
                   tags=['Pending Data'],
                   summary='Submit pending form data')
    def post(self, request, form_id, version):
        form = get_object_or_404(Forms, pk=form_id)
        try:
            serializer = SubmitPendingFormSerializer(data=request.data,
                                                     context={
                                                         'user': request.user,
                                                         'form': form})
            if not serializer.is_valid():
                return Response(
                    {'message': validate_serializers_message(
                        serializer.errors),
                        'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer.save()
            return Response({'message': 'ok'}, status=status.HTTP_200_OK)
        except Exception as ex:
            return Response({'message': ex.args},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(responses={
        (200, 'application/json'):
            inline_serializer("PendingDataList", fields={
                "current": serializers.IntegerField(),
                "total": serializers.IntegerField(),
                "total_page": serializers.IntegerField(),
                "data": ListPendingFormDataSerializer(many=True),
            })},
        tags=['Pending Data'],
        parameters=[
            OpenApiParameter(name='page',
                             required=True,
                             type=OpenApiTypes.NUMBER,
                             location=OpenApiParameter.QUERY),
        ],
        summary='To get list of pending form data')
    def get(self, request, form_id, version):
        form = get_object_or_404(Forms, pk=form_id)
        try:
            serializer = ListFormDataRequestSerializer(data=request.GET)
            if not serializer.is_valid():
                return Response(
                    {'message': validate_serializers_message(
                        serializer.errors)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            page_size = REST_FRAMEWORK.get('PAGE_SIZE')
            page = request.GET.get('page')

            queryset = form.pending_form_form_data.filter(
                created_by=request.user, batch__isnull=True).order_by(
                '-created')
            paginator_temp = Paginator(queryset, page_size)
            paginator_temp.page(request.GET.get('page', page))

            paginator = PageNumberPagination()
            instance = paginator.paginate_queryset(queryset, request)

            data = {
                "current": int(request.GET.get('page', '1')),
                "total": queryset.count(),
                "total_page": ceil(queryset.count() / page_size),
                "data": ListPendingFormDataSerializer(
                    instance=instance,
                    many=True).data,
            }
            return Response(data, status=status.HTTP_200_OK)
        except (InvalidPage, EmptyPage):
            return Response({'message': 'data not found'},
                            status=status.HTTP_404_NOT_FOUND)
        except Exception as ex:
            return Response({'message': ex.args},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)
