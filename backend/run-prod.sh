#!/usr/bin/env bash
# shellcheck disable=SC2155

python manage.py migrate
python manage.py administration_seeder
gunicorn rtmis.wsgi:application