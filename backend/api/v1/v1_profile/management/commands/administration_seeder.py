import pandas as pd
import json
import numpy as np
from django.core.management import BaseCommand
from api.v1.v1_profile.models import Levels, Administration
from django.db.transaction import atomic

geo_config = [{
    "level": 0,
    "name": "NAME_0",
    "alias": "National"
}, {
    "level": 1,
    "name": "NAME_1",
    "alias": "County"
}, {
    "level": 2,
    "name": "NAME_2",
    "alias": "Sub-County"
}, {
    "level": 3,
    "name": "NAME_3",
    "alias": "Ward"
}]

source_file = './source/kenya.topojson'


def get_parent_id(df, x):
    if x["level"] == 0:
        return None
    parent_level = x["level"] - 1
    pid = df[(df["level"] == parent_level) & (df["name"] == x["p"])]
    pid = pid.to_dict("records")[0]
    return pid["id"]


class Command(BaseCommand):

    @atomic
    def handle(self, *args, **options):
        if Administration.objects.count():
            self.stdout.write("You have performed administration seeder")
            exit()
        geo = open(source_file, 'r')
        geo = json.load(geo)
        ob = geo["objects"]
        ob_name = list(ob)[0]
        levels = [c["name"] for c in geo_config]
        properties = [
            d for d in [p["properties"] for p in ob[ob_name]["geometries"]]
        ]
        level_list = [
            Levels(name=g.get("alias"), level=g.get("level"))
            for g in geo_config
        ]
        Levels.objects.bulk_create(level_list)
        df = pd.DataFrame(properties)
        rec = df[levels].to_dict("records")
        res = []
        for i, r in enumerate(rec):
            for iv, v in enumerate(levels):
                lv = list(filter(lambda x: x["name"] == v,
                                 geo_config))[0]["level"]
                plv = None
                if lv > 0:
                    plv = r[levels[iv - 1]]
                data = {
                    "name": r[v],
                    "p": plv,
                    "level": lv,
                }
                res.append(data)
        res = pd.DataFrame(res)
        res = res.dropna(subset=["name"]).reset_index()
        subset = ["name", "p", "level"]
        res = res.drop_duplicates(subset=subset).sort_values(["level", "name"
                                                              ]).reset_index()
        res = res[subset]
        res["id"] = res.index + 1
        res["parent"] = res.apply(lambda x: get_parent_id(res, x), axis=1)
        res = res[["id", "parent", "name", "level"]]
        res = res.replace({np.nan: None})
        res = res.to_dict('records')
        for r in res:
            administration = Administration(
                id=r.get("id"),
                name=r.get("name"),
                parent=Administration.objects.filter(
                    id=r.get("parent")).first(),
                level=Levels.objects.filter(level=r.get("level")).first())
            administration.save()
        self.stdout.write('-- FINISH')
