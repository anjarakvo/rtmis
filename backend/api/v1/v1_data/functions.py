import re
import json
from pathlib import Path
from datetime import datetime
from django.db import transaction, connection
from rtmis.settings import CACHE_FOLDER


@transaction.atomic
def refresh_materialized_data():
    with connection.cursor() as cursor:
        cursor.execute("""
            REFRESH MATERIALIZED VIEW view_data_options;""")


def get_cache(name):
    name = re.sub(r'[\W_]+', '_', name)
    today = datetime.now().strftime("%Y%m%d")
    cache_name = f"{CACHE_FOLDER}{today}-{name}.json"
    if Path(cache_name).exists():
        with open(cache_name, 'r') as cache_file:
            return json.load(cache_file)
    return None


def create_cache(name, resp):
    name = re.sub(r'[\W_]+', '_', name)
    today = datetime.now().strftime("%Y%m%d")
    cache_name = f"{CACHE_FOLDER}{today}-{name}.json"
    json_cache = json.dumps(resp, separators=(',', ":"))
    with open(cache_name, "w") as outfile:
        outfile.write(json_cache)