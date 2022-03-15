# Generated by Django 4.0.2 on 2022-03-15 05:55

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ('v1_data', '0010_viewpendingdataapproval'),
    ]

    operations = [
        migrations.RunSQL(
            """
            CREATE OR REPLACE VIEW view_pending_approval as
   SELECT
   DISTINCT pa.*, COALESCE(max(pa2.level_id), 0) as pending_level
   FROM pending_data_approval pa
   LEFT JOIN (
       SELECT * FROM pending_data_approval pda
       WHERE pda.status in (1,3)) as pa2
   ON pa2.batch_id = pa.batch_id
GROUP BY pa.id

            """
        )
    ]
