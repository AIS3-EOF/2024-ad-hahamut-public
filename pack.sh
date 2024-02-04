#!/bin/bash
>service/db.sqlite </dev/null
tar --sort=name --owner=root:0 --group=root:0 --mtime='1970-01-01' -czf hahamut_dist.tar.gz \
    service/src \
    service/public \
    service/views \
    service/package.json \
    service/yarn.lock \
    service/db.sqlite \
    service/Dockerfile \
    service/docker-compose.yml \
    service/.env.example \
    for_players.md
