# 各種指令的 JSON Response 格式

`search` 與 `list` 指令皆給出 `BotResponse` 格式。

## Type `BotResponse`

```ts
interface BotResponse {
  offers: Offer[]
  merchants: Merchant[]
}
```

- `offers`: 優惠券清單。
- `merchants`: 商家清單。

## Type `Offer`

```ts
interface Offer {
  id: number
  title: string
  price: number
  imageUrl: string
  startTime: string
  endTime: string
  rules: string[]
  products: Product[]
  merchantIds: number[]
}
```

- `id`: 優惠券 ID。
- `title`: 優惠券名稱，通常包含商品名稱。
- `price`: 該優惠券對應的商品的價格。通常是新台幣。
- `imageUrl`: 商品圖片的網址。
- `startTime`: 優惠券生效時間。
- `endTime`: 優惠券截止時間。
- `rules`: 優惠券的使用規則。
- `products`: 該優惠券適用的商品。通常只會有一個。
- `merchantIds`: 該優惠券適用的商家的 ID。

## Type `Product`

```ts
interface Product {
  id: number
  title: string
  price: number
  imageUrl: string
}
```

- `id`: 商品 ID。
- `title`: 商品名稱。
- `price`: 商品價格。通常是新台幣。
- `imageUrl`: 商品圖片的網址。

## Type `Merchant`

```ts
interface Merchant {
  id: number
  name: string
}
```

- `id`: 商店 ID。
- `name`: 商店名稱。
