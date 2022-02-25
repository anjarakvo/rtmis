from django.urls import re_path

from api.v1.v1_forms.views import web_form_details, list_form, form_data, \
    edit_form_type, edit_form_approval, approval_form_users, \
    form_approval_level, form_approval_level_administration, form_approver

urlpatterns = [
    re_path(r'^(?P<version>(v1))/web/form/(?P<pk>[0-9]+)/',
            web_form_details),
    # list/forms
    re_path(r'^(?P<version>(v1))/forms/', list_form),
    re_path(r'^(?P<version>(v1))/form/(?P<pk>[0-9]+)/',
            form_data),
    # edit/form/type
    re_path(r'^(?P<version>(v1))/edit/forms/', edit_form_type),
    # assign/approval/level/
    re_path(r'^(?P<version>(v1))/edit/form/approval/', edit_form_approval),

    # approval/assign/user/
    re_path(r'^(?P<version>(v1))/approval/form/(?P<pk>[0-9]+)/',
            approval_form_users),
    # get/form/approval/level/
    re_path(r'^(?P<version>(v1))/form/approval-level/', form_approval_level),
    # admin/get/form/approval/level/
    re_path(r'^(?P<version>(v1))/admin/form/approval-level/(?P<pk>[0-9]+)/',
            form_approval_level_administration),
    # get/form/approver/
    re_path(r'^(?P<version>(v1))/form/approver/', form_approver),
]
