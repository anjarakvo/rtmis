# Generated by Django 4.0.4 on 2022-07-06 09:19

from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('v1_forms', '0009_questionattribute'),
    ]

    operations = [
        migrations.RunSQL("""
                DELETE FROM user_form WHERE id NOT IN(
                SELECT DISTINCT ON (user_id, form_id) id from user_form)
                """),
        migrations.AlterUniqueTogether(
            name='userforms',
            unique_together={('user', 'form')},
        ),
    ]