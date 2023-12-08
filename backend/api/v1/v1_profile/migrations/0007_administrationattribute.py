# Generated by Django 4.0.4 on 2023-11-24 02:51

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('v1_profile', '0006_alter_access_role'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdministrationAttribute',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.TextField()),
                ('options', django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=255, null=True), blank=True, default=list, size=None)),
            ],
            options={
                'db_table': 'administration_attribute',
            },
        ),
    ]