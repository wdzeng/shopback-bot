import axios from 'axios'
import { SHOPBACK_AGENT, SHOPBACK_KEY } from '../lang/shopback-api'

export async function followOffer(
  offerId: number,
  accessToken: string
): Promise<void> {
  const url = `https://api-app.shopback.com.tw/rs/offer/follow/${offerId}`
  const headers = {
    'x-shopback-agent': SHOPBACK_AGENT,
    'x-shopback-key': SHOPBACK_KEY,
    authorization: 'JWT ' + accessToken,
  }
  await axios.post(url, null, { headers })
  // TODO handle error
}
