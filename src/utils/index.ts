import { ShopbackMerchant } from '../lang/shopback-api'

export function mergeMerchants(
  merchants: ShopbackMerchant[]
): ShopbackMerchant[] {
  merchants.sort((a, b) => a.id - b.id)
  const ret: ShopbackMerchant[] = []
  for (const m of merchants) {
    if (ret.length === 0 || m.id != ret[ret.length - 1].id) {
      ret.push(m)
    }
  }
  return ret
}

export function sleep(timeout: number): Promise<unknown> {
  return new Promise(res => setTimeout(res, timeout))
}
