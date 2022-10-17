import axios, { AxiosError } from 'axios'
import { NotLoggedInException } from '../lang/errors'
import { Profile } from '../lang/profile'
import {
  ShopbackErrorResponse,
  SHOPBACK_AGENT,
  SHOPBACK_DOMAIN,
  SHOPBACK_KEY,
} from '../lang/shopback-api'

interface ShopbackProfileResponse {
  account_id: number
  email: string
  full_name: string
  country: string // TW
}

const URL_GET_PROFILE =
  'https://api-app.shopback.com.tw/members/v3/me?type=mobile&ctag=tag_kyc_fetch%27'

export async function getProfile(
  accessToken: string,
  userAgent: string
): Promise<Profile> {
  const headers = {
    authorization: 'JWT ' + accessToken,
    'x-shopback-key': SHOPBACK_KEY,
    'x-shopback-agent': SHOPBACK_AGENT,
    'x-shopback-client-user-agent': userAgent,
    'x-shopback-domain': SHOPBACK_DOMAIN,
  }
  try {
    const { data } = await axios.get<ShopbackProfileResponse>(URL_GET_PROFILE, {
      headers,
    })
    return {
      id: data.account_id,
      name: data.full_name,
      email: data.email,
      country: data.country,
    }
  } catch (e: unknown) {
    if (e instanceof AxiosError) {
      const err: ShopbackErrorResponse = e.response!.data
      if (err.error.code === 50002 || err.error.code === 20031) {
        throw new NotLoggedInException()
      }
    }
    throw e
  }
}
