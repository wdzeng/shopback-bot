# Shopback Bot

[![release](https://badgen.net/github/release/wdzeng/shopback-bot/stable?color=red)](https://github.com/wdzeng/shopback-bot/releases/latest)
[![github](https://badgen.net/badge/icon/github/black?icon=github&label=)](https://github.com/wdzeng/shopback-bot)
[![docker](https://badgen.net/badge/icon/docker?icon=docker&label=)](https://hub.docker.com/repository/docker/hyperbola/shopback-bot)

這是一個可以幫你登記 Shopback 發票回饋的機器人。

Shopback 發票回饋必須在結帳前事先登記，才能領取回饋。發票回饋通常一樣商品一個星期限一次，因此就算要在很閒的時候先登記好，但如果有很多需要潛在商品要登記的話，就會變得很麻煩。

這個機器人只適用於台灣的 Shopback，而且只適用於 Shopback 的發票回饋。

這裡姑且稱「登記發票回饋」為「登記優惠券」。實際上那就是優惠券。

## 準備

因為 Shopback 網站有加上 reCAPTCHA，所以機器人沒辦法實作登入操作。使用者需要自己撈 cookie 出來。請參考這份[教學](/docs/get-cookie.md)。

## 使用方式

### 以關鍵字查詢優惠券

以下範例示範查詢查詢優酪乳和紅茶。

```sh
hyperbola/shopback-bot:1 search -n 50 '優酪乳' '紅茶'
```

> **Note**
> 搜尋結果理論上會跟手機 app 實際查到的一樣，但是機器人會把廣告結果去掉。Shopback 通常會在手機上展示三個廣告，因此手機查詢結果的第四名會是機器人查詢結果的第一名，依此類推。

通用指令格式如下。

```sh
hyperbola/shopback-bot:1 search [options...] <keyword>
```

可用的 option 如下。

- `-n`, `--limit`: 列出查詢結果的前 n 張優惠券（如果查到的優惠券數量沒有那麼多，則只列出那些）。此值必須為正整數。預設為 `10`。
- `-f`, `--force`: 即使沒有查詢到任何優惠券，也不要回報失敗。
- `-J`, `--json`: 以 [JSON 格式](/docs/response.md)輸出查詢結果（預設是簡單的條列式）。JSON 格式給出的訊息比條列式詳細很多。

Exit code 如下表所示。

| Exit Code | 解釋 |
| --------- | --- |
| 0         | 查詢成功。 |
| 1         | 沒有查詢到任何優惠券。如果搭配 `--force`，會改回傳 0。 |

### 以關鍵字登記優惠券

這個方法是透過給定的商品關鍵字，然後針對優惠券的搜尋結果進行登記。

以下示範登記優酪乳前 5 名和紅茶前 5 名的優惠券。

```sh
hyperbola/shopback-bot:1 follow -n 5 '優酪乳' '紅茶'
```

通用指令格式如下。

```sh
hyperbola/shopback-bot:1 follow [options...] <keywords...>
```

可用的 option 如下。除非標示必填，所有選項都是選填。

- `-c`, `--credential`: Cookie 檔案的位置。必填。
- `-n`, `--limit`: 對查詢結果的前 n 張優惠券進行登記（如果查到的優惠券數量沒有那麼多，則只登記那些）；如果填 `0` 則登記所有優惠券。此值必須為非負整數。預設為 `0`。
- `-f`, `--force`: 即使沒有查詢到任何優惠券，也不要回報失敗。
- `-J`, `--json`: 以 JSON 格式輸出登記結果（預設是簡單的條列式）。JSON 格式給出的訊息比條列式詳細很多。

Exit code 如下表所示。

| Exit Code | 解釋 |
| --------- | --- |
| 0         | 登記成功。 |
| 1         | 沒有搜尋結果。如果搭配 `--force`，會改回傳 0。 |

### 查詢已登記的優惠券

通用指令格式如下。

```sh
hyperbola/shopback-bot:1 list [options...]
```

可用的 option 如下。除非標示必填，所有選項都是選填。

- `-c`, `--credential`: Cookie 檔案的位置。必填。
- `-n`, `--limit`: 最多只列出已登記的前 n 張優惠券（依登記時間倒序）；如果填 `0` 則列出所有已登記的優惠券。此值必須為非負整數。預設為 `0`。
- `-f`, `--force`: 即使你沒有登記任何優惠券，也不要回報失敗。
- `-J`, `--json`: 以 [JSON 格式](/docs/response.md)輸出登記結果（預設是簡單的條列式）。JSON 格式給出的訊息比條列式詳細很多。

Exit code 如下表所示。

| Exit Code | 解釋 |
| --------- | --- |
| 0         | 你登記至少一張優惠券。 |
| 1         | 你沒有登記任何優惠券。如果搭配 `--force`，會改回傳 0。 |

## 錯誤排解

### 其他 Exit Code

| Exit Code | 解釋 |
| --------- | ---- |
| 2 | Cookie 檔案不合法。 |
| 3 | 不是台灣 Shopback 帳號。 |
| 4 | Shopback 伺服器回傳錯誤訊息。 |
| 87 | Cookie 無效或已失效。 |
| 88 | 參數不合法。 |
| 254 | 網路問題。 |
| 255 | 不明錯誤。 |
