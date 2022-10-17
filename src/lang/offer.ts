import {
  ShopbackMerchant,
  ShopbackOfferCashback,
  ShopbackProduct,
} from './shopback-api'

interface IFollowList<T extends Offer> {
  offers: T[]
  merchants: ShopbackMerchant[]
}

export type OfferList = IFollowList<Offer>

export type SearchedOfferList = OfferList & { hasNextPage: boolean }

export type FollowedOfferList = OfferList & { offerCount: number }

export type OfferListFollowResult = IFollowList<SearchedOffer>

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

export type SearchedOffer = Offer & { newFollowed: boolean }
