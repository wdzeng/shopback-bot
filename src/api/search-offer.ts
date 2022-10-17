import axios from 'axios'
import { OfferList, Offer } from '../lang/offer'
import {
  ShopbackMerchant,
  ShopbackOfferCashback,
  ShopbackProduct,
  ShopbackResponseData,
  SHOPBACK_AGENT,
  SHOPBACK_KEY,
} from '../lang/shopback-api'
import { mergeMerchants } from '../utils'

interface ShopbackOfferSearchResponse {
  // TODO: Not sure what this is. Remove it if not used in the future.
  filterV2: {
    options: unknown[]
  }
  items: ShopbackOfferSearchResponseItem[] // length === 1
  hasNextPage: boolean
  // TODO: Not sure what this is. Remove it if not used in the future.
  orcaRequestId: string
}

interface ShopbackOfferSearchResponseItem {
  // TODO: Remove it if not used in the future and merge it with
  // ShopbackResponseData.
  // It seems that this value is always 'group'.
  type: 'group'
  data: ShopbackOfferSearchData
}

interface ShopbackOfferSearchData {
  total: number
  items: ShopbackResponseData<ShopbackOffer>[]
}

interface ShopbackOffer {
  id: number
  title: string
  offerCashback: ShopbackOfferCashback
  price: number
  startTime: string
  endTime: string
  totalRedeemableCount: number
  status: string
  imageUrl: string
  hint: string
  rules: string[]
  products: ShopbackProduct[]
  merchants: ShopbackMerchant[]
  adsTag?: string
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
    merchantIds: ob.merchants.map(m => m.id),
  }
}

export async function searchOffers(
  keyword: string,
  page: number,
  size: number
): Promise<OfferList> {
  const startPage = page + 1 // convert 0-based to 1-based
  const keywordEncode = encodeURI(keyword)
  const url = `https://api-app.shopback.com.tw/v2/search?keyword=${keywordEncode}&productPage=1&productSizePerPage=20&sbMartOfferSortBy=default&sbMartOfferPage=${startPage}&sbMartOfferSizePerPage=${size}&sbMartAdsOfferPageType=SEARCH&types%5B%5D=mart`
  const headers = {
    'x-shopback-agent': SHOPBACK_AGENT,
    'x-shopback-key': SHOPBACK_KEY,
  }
  const response = await axios.get<ShopbackOfferSearchResponse>(url, {
    headers,
  })

  // Collect all ShopbackOffer object and remove ads
  const ofCollection = response.data.items[0].data.items
    .filter(e => !e.data.adsTag)
    .map(e => e.data)

  const offers = ofCollection.map(offerToDTO)
  const merchants = mergeMerchants(ofCollection.map(o => o.merchants).flat())
  return { offers, merchants }
}
