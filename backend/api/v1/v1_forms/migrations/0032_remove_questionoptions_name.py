# Generated by Django 4.0.4 on 2024-02-22 07:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('v1_forms', '0031_rename_code_questionoptions_value_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='questionoptions',
            name='name',
            field=models.CharField(max_length=255, default="Test")
        ),
        migrations.RemoveField(
            model_name='questionoptions',
            name='name',
        ),
    ]