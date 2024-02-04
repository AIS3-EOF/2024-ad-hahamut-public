# 簡介

這題是個 Attack and Defence 的題目，目標是在比賽同時進行**攻擊**其他隊伍的服務拿到 flag，還有給自己隊伍的題目上 patch 修補服務中的漏洞作為**防禦**。

# Attack

## 攻擊目標

各隊伍會有個網頁服務在 `http://10.102.x.20:8763/` (x 是隊伍的 team id)，而你的攻擊目標是透過找到服務本身的漏洞去攻擊其他隊伍，讀對方的 `/flag` 檔案，此檔案每個 round 都會自動更新一次。

另外，每個隊伍在每個回合都會有 SLA 分數，這部分是透過一個自動化的 service check 來對各隊的服務做檢查，看看網站的功能是否能正常使用，這部分細節會在下面的 Defence 部分提到。而作為攻擊者，你也能透過服務的漏洞去破壞對方的網站使其無法正常使用 (無法通過 service check)，這樣對方就無法得到該回合的 SLA 分數。基本上所有你找到的漏洞只要能拿來讓對方過不了 service check 都可用 (例如毀壞對方網站的資料庫)，不過唯一不能使用的是資源消耗類的 DoS (Denial of Service) 攻擊，也就是透過大量流量使對方網站無法再接受更多請求類型的攻擊。

如果你的網站因被其他隊伍攻擊而無法通過 service check 而想重置服務，請參考後面的 Defence 中的**重置服務**的說明。

# Defense

## 如何 patch

> 前置需求: `docker`, `zstd`

1. 修改 `service` 資料夾中的檔案，包括 source code 本身與 `Dockerfile`
2. 建立 image: `docker build . -t hahamut:latest` (請勿改變這邊的 tag name)
3. 匯出 image: `docker save hahamut:latest | zstd > image.zst`
4. 上傳 `image.zst` 到 scoreboard 中 patch 服務的地方

> 請務必確保修改後的 container 能在提供的 `docker-compose.yml` 的環境正常運作
>
> 使用 M1/M2 的人要特別注意你的 image 是否能在 x86-64 Linux 環境正常運作

## patch 原則

上 patch 的目的是為了修補 source code 中的漏洞，但同時不能破壞現有的功能。這部分會透過題目的 service check 來檢查。在嘗試做 patch 前務必先嘗試理解整個 code base 到底有哪些功能存在，不要因為 patch 而讓自己的 service check 失敗。

service check 原則上會透過 Puppeteer 操控瀏覽器去模仿一般人類使用者的操作，如登入、發文、回文等等，也包含一些 admin 的管理操作。這些部分有仰賴網頁上的文字和 HTML 結構 (id, class, ...) 等等，因此 patch 請勿修改這些部分，否則很容易造成額外的 service check 失敗。

## patch 時會發生的事

patch 的時後端的執行流程大致如下:

1. 更新服務的 container image (`cat patch_file | zstd -d | docker load`)
2. 清空 database
3. 隨機產生一個新的 admin password
4. 啟動服務 (`docker compose up -d`)

## 重置服務

方法很簡單，就是使用題目提供的 source code 透過上面的方法建立一個 container image，然後上傳到 scoreboard 中 patch 服務的地方即可。
