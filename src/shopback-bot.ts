import * as ShopbackAPI from './api'
import { OfferAlreadyFollowedException } from './lang/errors'
import { Offer, OfferList } from './lang/offer'
import { ShopbackMerchant } from './lang/shopback-api'
import { mergeMerchants } from './utils'

export interface IShopbackBot {
  getFollowedOffers(count?: number): Promise<OfferList>
  searchOffers(keyword: string, count: number): Promise<OfferList>
  followOffer(offerId: number, force: boolean): Promise<boolean>
  getUsername(): Promise<string>
}

export class ShopbackBot implements IShopbackBot {
  private tokenExpiredTime: null | number = null

  constructor(
    private accessToken: string,
    private refreshToken: string,
    private userAgent: string
  ) {}

  async getFollowedOffers(count?: number): Promise<OfferList> {
    // Query for 50 offers per search. If this number is greater than 50 then
    // Shopback server responses 15 items only. Not know why.
    const SEARCH_COUNT_PER_PAGE = 50

    let offers: Offer[] = []
    let merchants: ShopbackMerchant[] = []
    let totalCount: null | number = null
    let page = 0
    while (
      (totalCount === null || offers.length < totalCount) &&
      (count === undefined || offers.length < count)
    ) {
      await this.refreshAccessTokenIfNeeded()
      const offerList = await ShopbackAPI.getFollowedOffers(
        this.accessToken,
        page++,
        SEARCH_COUNT_PER_PAGE
      )

      // The real offer count may be changed if another user is doing some
      // operation at the same time. In some case it may lead to infinite while
      // loop. If we found no new offers, stop immediately.
      if (offerList.offers.length === 0) {
        break
      }

      if (totalCount === null) {
        totalCount = offerList.offerCount
      }

      offers = offers.concat(
        // prettier-ignore
        offerList.offers.slice(0, count && (count - offers.length))
      )
      merchants = merchants.concat(offerList.merchants)
    }

    return {
      offers,
      merchants: mergeMerchants(merchants, offers),
    }
  }

  async searchOffers(keyword: string, count: number): Promise<OfferList> {
    // Query for 50 offers per search. If this number is greater than 50 then
    // Shopback server responses 15 items only. Not know why.
    const SEARCH_COUNT_PER_PAGE = 50

    let offers: Offer[] = []
    let merchants: ShopbackMerchant[] = []
    let page = 0
    let hasNextPage = true
    while (hasNextPage && offers.length < count) {
      const offerList = await ShopbackAPI.searchOffers(
        keyword,
        page++,
        SEARCH_COUNT_PER_PAGE
      )

      offers = offers.concat(offerList.offers.slice(0, count - offers.length))
      merchants = merchants.concat(offerList.merchants)

      // If Shopback server replies with empty list then break the search.
      // Otherwise this may lead to infinite loop.
      hasNextPage = offerList.hasNextPage && offerList.offers.length > 0
    }

    return {
      offers,
      merchants: mergeMerchants(merchants, offers),
    }
  }

  async followOffer(offerId: number, force: boolean): Promise<boolean> {
    await this.refreshAccessTokenIfNeeded()
    try {
      await ShopbackAPI.followOffer(offerId, this.accessToken)
      return true
    } catch (e: unknown) {
      if (e instanceof OfferAlreadyFollowedException && force) {
        // ignore
        return false
      }
      throw e
    }
  }

  async getUsername(): Promise<string> {
    // TODO if failed to refresh then consider not login
    await this.refreshAccessToken()

    const profile = await ShopbackAPI.getProfile(
      this.accessToken,
      this.userAgent
    )

    if (profile.country !== 'TW') {
      // TODO this bot is only for Taiwan users
    }

    return profile.name
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
