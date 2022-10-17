import * as ShopbackAPI from './api'
import { OfferList } from './lang/offer'

export interface IShopbackBot {
  getFollowedOffers(page: number, size: number): Promise<OfferList>
  searchOffers(keyword: string, page: number, size: number): Promise<OfferList>
  followOffer(offerId: number): Promise<void>
}

export class ShopbackBot implements IShopbackBot {
  private tokenExpiredTime: null | number = null

  constructor(
    private accessToken: string,
    private refreshToken: string,
    private userAgent: string
  ) {}

  async getFollowedOffers(page: number, size: number): Promise<OfferList> {
    await this.refreshAccessTokenIfNeeded()
    return ShopbackAPI.getFollowedOffers(this.accessToken, page, size)
  }

  searchOffers(
    keyword: string,
    page: number,
    size: number
  ): Promise<OfferList> {
    return ShopbackAPI.searchOffers(keyword, page, size)
  }

  async followOffer(offerId: number): Promise<void> {
    await this.refreshAccessTokenIfNeeded()
    return ShopbackAPI.followOffer(offerId, this.accessToken)
  }

  private refreshAccessTokenIfNeeded(): Promise<void> {
    if (!this.tokenExpiredTime || Date.now() > this.tokenExpiredTime) {
      return this.refreshAccessToken()
    }
    return Promise.resolve()
  }

  private async refreshAccessToken(): Promise<void> {
    const newToken = await ShopbackAPI.refreshAccessToken(
      this.accessToken,
      this.refreshToken,
      this.userAgent
    )
    this.accessToken = newToken.access_token
    this.refreshToken = newToken.refresh_token

    this.tokenExpiredTime = Date.now()
    this.tokenExpiredTime += newToken.expires_in * 1000
    // For safety, shorten the timeout by 10 minutes
    this.tokenExpiredTime -= 10 * 60 * 1000
  }
}
