import {
  ShopbackMerchant,
  ShopbackOfferCashback,
  ShopbackProduct,
} from './shopback-api'

export interface OfferList {
  offers: Offer[]
  merchants: ShopbackMerchant[]
}

export interface FollowedOfferList extends OfferList {
  offerCount: number
}

export interface Offer {
  id: number
  title: string
  offerCashback: ShopbackOfferCashback
  price: number
  imageUrl: string
  hint: string
  rules: string[]
  startTime: Date
  endTime: Date
  totalRedeemableCount: number
  status: string
  products: ShopbackProduct[]
  merchantIds: number[]
}
