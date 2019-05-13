## Docker

```
docker run -d \
    --name addic7eddler \
    --restart=always \
    -e PGID=1000 -e PUID=1000 \
    -p 5252:8080 \
    --network=cloudbox \
    --network-alias=addic7eddler \
    -v /opt/addic7eddler/:/config \
    -v /opt/addic7eddler/:/data \
    -v /mnt/unionfs/Media:/media \
     -v /mnt/:/mnt/ \
    --label com.github.cloudbox.cloudbox_managed=false \
    niico/addic7eddler

```

