import { Offer, OfferList } from '../lang/offer'
import { ShopbackMerchant } from '../lang/shopback-api'

export function mergeMerchants(
  merchants: ShopbackMerchant[],
  offers?: Offer[]
): ShopbackMerchant[] {
  const reservedIds = offers
    ? new Set(offers.map(o => o.merchantIds).flat())
    : null

  merchants.sort((a, b) => a.id - b.id)
  const ret: ShopbackMerchant[] = []

  for (const m of merchants) {
    if (
      (ret.length === 0 || m.id != ret[ret.length - 1].id) &&
      (!reservedIds || reservedIds.has(m.id))
    ) {
      ret.push(m)
    }
  }
  return ret
}

export function mergeOfferList(a: OfferList, b: OfferList) {
  a.offers = a.offers.concat(b.offers)
  a.merchants = mergeMerchants(a.merchants.concat(b.merchants), a.offers)
}
