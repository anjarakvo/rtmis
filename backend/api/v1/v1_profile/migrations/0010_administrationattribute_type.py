# Generated by Django 4.0.4 on 2023-11-27 05:04

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('v1_profile', '0009_alter_administration_parent'),
    ]

    operations = [
        migrations.AddField(
            model_name='administrationattribute',
            name='type',
            field=models.CharField(choices=[('value', 'Value'), ('option', 'Option'), ('multiple_option', 'Multiple option'), ('aggregate', 'Aggregate')], default='value', max_length=25),
        ),
    ]