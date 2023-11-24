from django.db import models
from django.contrib.postgres.fields import ArrayField

# Create your models here.
from api.v1.v1_profile.constants import UserRoleTypes
from api.v1.v1_users.models import SystemUser


class Levels(models.Model):
    name = models.CharField(max_length=50)
    level = models.IntegerField()

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'levels'


class Administration(models.Model):
    parent = models.ForeignKey('self',
                               on_delete=models.SET_NULL,
                               # NOTE: should be named 'children'
                               related_name='parent_administration',
                               default=None,
                               null=True)
    code = models.CharField(max_length=255, null=True, default=None)
    level = models.ForeignKey(to=Levels,
                              on_delete=models.CASCADE,
                              related_name='administrator_level')
    name = models.TextField()
    path = models.TextField(null=True, default=None)

    def __str__(self):
        return self.name

    @property
    def ancestors(self):
        if self.path:
            ids = self.path.split(".")[:-1]
            administrations = Administration.objects.filter(
                id__in=ids).order_by('level__level')
            return administrations
        return None

    @property
    def full_name(self):
        if self.path:
            names = " - ".join([a.name for a in self.ancestors])
            return "{} - {}".format(names, self.name)
        return self.name

    @property
    def administration_column(self):
        if self.path:
            names = "|".join([a.name for a in self.ancestors])
            return "{}|{}".format(names, self.name)
        return self.name

    class Meta:
        db_table = 'administrator'


class Access(models.Model):
    user = models.OneToOneField(to=SystemUser,
                                on_delete=models.CASCADE,
                                related_name='user_access')
    administration = models.ForeignKey(to=Administration,
                                       on_delete=models.CASCADE,
                                       related_name='user_administration')
    role = models.IntegerField(choices=UserRoleTypes.FieldStr.items())

    def __str__(self):
        return UserRoleTypes.FieldStr.get(self.role)

    @property
    def role_name(self):
        return UserRoleTypes.FieldStr.get(self.role)

    class Meta:
        db_table = 'access'


class AdministrationAttribute(models.Model):
    name = models.TextField()
    options = ArrayField(
            models.CharField(max_length=255, null=True),
            default=list,
            blank=True)

    class Meta:
        db_table = 'administration_attribute'


class AdministrationAttributeValue(models.Model):
    administration = models.ForeignKey(
            to=Administration,
            on_delete=models.CASCADE,
            related_name='attributes')
    attribute = models.ForeignKey(
            to=AdministrationAttribute, on_delete=models.CASCADE)
    value = models.TextField()
    options = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'administration_attribute_value'
