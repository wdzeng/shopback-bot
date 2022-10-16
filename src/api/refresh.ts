import axios from 'axios'
import { SHOPBACK_AGENT, SHOPBACK_KEY } from '../lang/shopback-api'

interface ShopbackRefreshTokenResponse {
  token_type: string
  access_token: string
  refresh_token: string
  expires_in: number // 3600
}

const URL_API = 'https://api-app.shopback.com.tw/members/me/refresh-jwt-token'

export async function refreshAccessToken(
  oldAccessToken: string,
  refreshToken: string,
  userAgentToken: string
): Promise<ShopbackRefreshTokenResponse> {
  const headers = {
    'x-shopback-agent': SHOPBACK_AGENT,
    'x-shopback-key': SHOPBACK_KEY,
    'x-shopback-client-user-agent': userAgentToken,
    'x-shopback-jwt-access-token': oldAccessToken,
    'x-shopback-member-refresh-token': refreshToken,
  }
  const { data } = await axios.post<ShopbackRefreshTokenResponse>(
    URL_API,
    null,
    { headers }
  )
  return data
}
