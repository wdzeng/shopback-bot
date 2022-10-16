import { AxiosError } from 'axios'
import * as ShopbackAPI from './api'
import {
  OfferAlreadyFollowedException,
  OfferNotFoundException,
} from './lang/errors'
import { OfferList } from './lang/offer'
import { ShopbackErrorResponse } from './lang/shopback-api'

export interface IShopbackBot {
  getFollowedOffers(page: number, size: number): Promise<OfferList>
  searchOffers(keyword: string, page: number, size: number): Promise<OfferList>
  followOffer(offerId: number, force: boolean): Promise<boolean>
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

  async followOffer(offerId: number, force: boolean): Promise<boolean> {
    await this.refreshAccessTokenIfNeeded()
    try {
      await ShopbackAPI.followOffer(offerId, this.accessToken)
      return true
    } catch (e: unknown) {
      if (e instanceof AxiosError) {
        const error: ShopbackErrorResponse = e.response!.data
        switch (error.error.code) {
          case 60004:
            if (force) {
              return false
            }
            throw new OfferAlreadyFollowedException(offerId)
          case 60011:
            throw new OfferNotFoundException(offerId)
        }
      }
      throw e
    }
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
