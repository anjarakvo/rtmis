# Generated by Django 4.0.4 on 2023-12-15 04:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('v1_forms', '0023_questions_hidden_questions_pre_alter_questions_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='questions',
            name='display_only',
            field=models.BooleanField(default=False, null=True),
        ),
        migrations.AddField(
            model_name='questions',
            name='monitoring',
            field=models.BooleanField(default=False, null=True),
        ),
    ]
