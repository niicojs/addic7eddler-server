# Addic7edler Server

Docker image to find missing subtitles and download them from the great Addic7ed website.

## Docker config on cloudbox

```
docker run -d \
    --name addic7eddler \
    --restart=always \
    --user node \
    --network=cloudbox \
    --network-alias=addic7eddler \
    -v /etc/localtime:/etc/localtime:ro \
    -v /opt/addic7eddler/:/config \
    -v /opt/addic7eddler/:/data \
    -v /mnt/unionfs/Media:/media \
     -v /mnt/:/mnt/ \
    --label com.github.cloudbox.cloudbox_managed=false \
    niico/addic7eddler-server
```

