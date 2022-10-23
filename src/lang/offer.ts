import {
  ShopbackMerchant,
  ShopbackOfferCashback,
  ShopbackProduct,
} from './shopback-api'

export interface OfferList {
  offers: Offer[]
  merchants: ShopbackMerchant[]
}

export type OfferFollowList = OfferList & { totalCount: number }

export type OfferSearchList = OfferList & { hasNextPage: boolean }

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
