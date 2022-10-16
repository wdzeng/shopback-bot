# 如何得到 Shopback 網站的 Cookie

這裡以 Chrome 瀏覽器為範例。

1. 打開無痕模式。這個步驟不能跳過。
2. 登入 Shopback 網站。請以帳號密碼登入，不要選擇 Facebook 或 Apple 等第三方登入。
3. 按 F12 開啟開發者工具，然後如下圖找到 cookie。

   ![F12](/res/cookie.png)

   上圖中 \[3\] 的部分如果有很多樣，隨便選擇一樣即可。如果 \[3\] 沒有任何東西，請 F5 重新整理網頁。
4. 上圖 \[4\] 就是 cookie。
5. 複製 cookie，把 cookie 存到某個檔案裡，注意只會有一行。注意不要複製到 `cookie:` 字樣。
6. 不要登出 Shopback，直接關閉瀏覽器。結束。

將 cookie 檔案餵給機器人即可正常使用。
