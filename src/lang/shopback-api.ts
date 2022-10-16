// Shopback apk version.
export const SHOPBACK_AGENT = 'sbandroidagent/4.12.1'

// Not sure what this key is for, but is irrelevant to users since it seems that
// all Shopback clients share the same key.
// https://github.com/gannasong/ShopBack/blob/3359ffb52a22661ce45ac123c444a1d242ebf0ca/ShopBack/Networking/Protocol/UserSession.swift#L27
export const SHOPBACK_KEY = 'q452R0g0muV3OXP8VoE7q3wshmm2rdI3'

export const SHOPBACK_URL_GRAPHQL =
  'https://api-app.shopback.com.tw/rs/graphql-auth'

export interface ShopbackErrorResponse {
  error: {
    code: number | string
    message: string
    http_code?: number
  }
  status?: string
  body?: {
    error: {
      message: string
    }
  }
}

export interface ShopbackSearchResponse<T> {
  // TODO: Not sure what this is. Remove it if not used in the future.
  filterV2: {
    options: unknown[]
  }
  items: ShopbackResponseItem<T>[]
  hasNextPage: boolean
  // TODO: Not sure what this is. Remove it if not used in the future.
  orcaRequestId: string
}

export interface ShopbackResponseData<T> {
  data: T
}

interface ShopbackResponseItem<T> {
  // TODO: Remove it if not used in the future and merge it with
  // ShopbackResponseData.  
  // It seems that this value is always 'group'.
  type: 'group'
  data: T
}

export interface ShopbackOfferCashback {
  amount: number
  sign: string
  description: string
  modifier: string
  currency: string
}

export interface ShopbackProduct {
  id: number
  imageUrl: string
  title: string
  price: number
}

export interface ShopbackMerchant {
  // 1 全家
  // 2 7-11
  // 3 全聯
  // 4 HiLife
  // 5 OK
  // 6 家樂福
  // 7 大潤發
  // 8 愛買
  // 9 屈臣氏
  // 15 美聯社
  id: number
  name: string
  shortName: string
  imageUrl: string
}
