# Generated by Django 4.0.1 on 2022-02-28 10:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('v1_forms', '0006_remove_answers_created_by_remove_answers_data_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='questions',
            name='type',
            field=models.IntegerField(choices=[(1, 'Geo'), (2, 'Administration'), (3, 'Text'), (4, 'Number'), (5, 'Option'), (6, 'Multiple_Option'), (7, 'Cascade'), (8, 'Photo'), (9, 'Date')]),
        ),
    ]
