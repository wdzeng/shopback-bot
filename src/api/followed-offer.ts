import axios from 'axios'
import { OfferFollowList, Offer } from '../lang/offer'
import {
  ShopbackMerchant,
  ShopbackOfferCashback,
  ShopbackProduct,
  ShopbackResponseData,
  SHOPBACK_KEY,
  SHOPBACK_URL_GRAPHQL,
} from '../lang/shopback-api'

type ShopbackFollowedOfferResponse =
  ShopbackResponseData<ShopbackFollowedOfferResponseData>

interface ShopbackFollowedOfferResponseData {
  followOffers: {
    total: number
    offers: ShopbackOffer[]
  }
  merchants: {
    merchants: ShopbackMerchant[]
  }
}

interface ShopbackOffer {
  id: number
  title: string
  offerCashback: ShopbackOfferCashback
  price: number
  hint: string
  rules: string[]
  startTime: string
  endTime: string
  totalRedeemableCount: number
  status: string
  merchantIds: number[]
  imageUrl: string
  products: ShopbackProduct[]
}

function offerToDTO(ob: ShopbackOffer): Offer {
  return {
    id: ob.id,
    title: ob.title,
    offerCashback: ob.offerCashback,
    price: ob.price,
    startTime: new Date(ob.startTime),
    endTime: new Date(ob.endTime),
    totalRedeemableCount: ob.totalRedeemableCount,
    status: ob.status,
    imageUrl: ob.imageUrl,
    hint: ob.hint,
    rules: ob.rules,
    products: ob.products,
    merchantIds: ob.merchantIds,
  }
}

const GRAPHQL_QUERY = `
query GetFollowOffers($input: FollowOffersQueryInput!) {
  followOffers(followOffersQueryInput: $input) {
    total
    offers {
      id
      title
      offerCashback {
        amount
        sign
        description
        modifier
        currency
      }
      price
      hint
      rules
      startTime
      endTime
      totalRedeemableCount
      status
      merchantIds
      imageUrl
      products {
        id
        imageUrl
        title
        price
      }
    }
  }
  merchants {
    merchants {
      id
      name
      shortName
      imageUrl
    }
  }
}`

export async function getFollowedOffers(
  accessToken: string,
  page: number,
  size: number
): Promise<OfferFollowList> {
  const headers = {
    authorization: 'JWT ' + accessToken,
    'x-shopback-key': SHOPBACK_KEY,
  }
  const requestBody = {
    operationName: 'GetFollowOffers',
    variables: { input: { page, size } },
    query: GRAPHQL_QUERY,
  }
  const response = await axios.post<ShopbackFollowedOfferResponse>(
    SHOPBACK_URL_GRAPHQL,
    requestBody,
    { headers }
  )

  return {
    totalCount: response.data.data.followOffers.total,
    offers: response.data.data.followOffers.offers.map(offerToDTO),
    merchants: response.data.data.merchants.merchants,
  }
}
