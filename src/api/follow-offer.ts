import axios, { AxiosError } from 'axios'
import {
  OfferAlreadyFollowedException,
  OfferNotFoundException,
} from '../lang/errors'
import {
  ShopbackErrorResponse,
  SHOPBACK_AGENT,
  SHOPBACK_KEY,
} from '../lang/shopback-api'

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

  try {
    await axios.post(url, null, { headers })
  } catch (e: unknown) {
    if (e instanceof AxiosError) {
      const error: ShopbackErrorResponse = e.response!.data
      switch (error.error.code) {
        case 60004:
          throw new OfferAlreadyFollowedException(offerId)
        case 60011:
          throw new OfferNotFoundException(offerId)
      }
    }
    throw e
  }
  // TODO handle error
}
