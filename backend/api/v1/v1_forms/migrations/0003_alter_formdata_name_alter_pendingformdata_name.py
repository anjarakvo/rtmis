# Generated by Django 4.0.1 on 2022-02-03 06:37

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('v1_forms', '0002_alter_questionoptions_question'),
    ]

    operations = [
        migrations.AlterField(
            model_name='formdata',
            name='name',
            field=models.TextField(),
        ),
        migrations.AlterField(
            model_name='pendingformdata',
            name='name',
            field=models.TextField(),
        ),
    ]