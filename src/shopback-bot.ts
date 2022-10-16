import { AxiosError } from 'axios'
import * as ShopbackAPI from './api'
import {
  OfferAlreadyFollowedException,
  OfferNotFoundException,
} from './lang/errors'
import { Offer, OfferList } from './lang/offer'
import { ShopbackErrorResponse, ShopbackMerchant } from './lang/shopback-api'
import { mergeMerchants, sleep } from './utils'

export interface IShopbackBot {
  getFollowedOffers(): Promise<OfferList>
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

  async getFollowedOffers(): Promise<OfferList> {
    const size = 50
    const offers: Offer[] = []
    const merchants: ShopbackMerchant[] = []

    let totalCount: null | number = null
    let page = 0
    while (totalCount === null || offers.length < totalCount) {
      await this.refreshAccessTokenIfNeeded()
      const offerList = await ShopbackAPI.getFollowedOffers(
        this.accessToken,
        page++,
        size
      )

      if (offerList.offers.length === 0) {
        // The real offer count may be changed if another user is doing some
        // operation at the same time. In some case it may lead to infinite
        // while loop. If we found no new offers, stop immediately.
        break
      }

      if (totalCount === null) {
        totalCount = offerList.offerCount
      }
      offers.concat(offerList.offers)
      merchants.concat(offerList.merchants)

      // Wait for a delay or else we are blocked by the Shopback server.
      // 3 second should be enough.
      await sleep(3 * 1000)
    }

    return {
      offers,
      merchants: mergeMerchants(merchants),
    }
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
