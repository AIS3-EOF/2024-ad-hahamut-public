cat "$1" | zstd -d > tmp.tar
rm rootfs.tar
# https://git.jakstys.lt/motiejus/undocker
~/workspace/undocker/undocker tmp.tar rootfs.tar
rm -rf rootfs
mkdir rootfs
tar -xf rootfs.tar -C rootfs
if [ $? -ne 0 ]; then
    echo "Failed to unpack $1, use alternative method."
    rm -rf rootfs
    docker load < tmp.tar
    docker run --name tmp --rm -d hahamut:latest
    docker cp tmp:/app rootfs
    docker kill tmp
    exit 1
fi
rm tmp.tar
colordiff --exclude=node_modules --exclude=yarn.lock -bur ../service rootfs/app
