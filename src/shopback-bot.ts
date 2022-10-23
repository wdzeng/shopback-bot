import assert from 'node:assert'
import fs from 'node:fs'
import * as ShopbackAPI from './api'
import {
  UserNotLoggedInException,
  OfferAlreadyFollowedException,
  InvalidCookieError,
} from './lang/errors'
import { Offer, OfferList } from './lang/offer'
import { ShopbackMerchant } from './lang/shopback-api'
import { mergeMerchants } from './utils'

export interface IShopbackBot {
  getFollowedOffers(limit?: number): Promise<OfferList>
  searchOffers(keyword: string, limit?: number): Promise<OfferList>
  followOffer(offerId: number, force: boolean): Promise<boolean>
  getUsername(): Promise<string>
}

interface BotCredential {
  refreshToken: string
  accessToken: string
  clientUserAgent: string
}

function parsePlainCookie(cookieStr: string): BotCredential {
  const firstLine = cookieStr.split('\n')[0].trim()
  const cookies = firstLine.split(';')

  let accessToken = ''
  let refreshToken = ''
  let clientUserAgent = ''
  for (let cookie of cookies) {
    cookie = cookie.trim()
    const indexEq = cookie.indexOf('=')
    if (indexEq === -1) {
      continue
    }
    const key = cookie.substring(0, indexEq)
    const value = cookie.substring(indexEq + 1)
    switch (key) {
      case 'authDeviceId':
        clientUserAgent = value
        break
      case 'sbet':
        accessToken = value
        break
      case 'sbrefresh': // cspell:disable-line
        refreshToken = value
        break
    }
  }

  if (accessToken && refreshToken && clientUserAgent) {
    return { accessToken, refreshToken, clientUserAgent }
  }

  throw new InvalidCookieError(cookieStr)
}

export class ShopbackBot implements IShopbackBot {
  private tokenExpiredTime: null | number = null
  private auth: BotCredential | undefined = undefined

  constructor(private readonly credPath?: string) {}

  async getFollowedOffers(limit?: number): Promise<OfferList> {
    // Query for 50 offers per search. If this number is greater than 50 then
    // Shopback server responses 15 items only. Not know why.
    const SEARCH_COUNT_PER_PAGE = 50

    let offers: Offer[] = []
    let merchants: ShopbackMerchant[] = []
    let totalCount: null | number = null
    let page = 0
    while (
      (totalCount === null || offers.length < totalCount) &&
      (limit === undefined || offers.length < limit)
    ) {
      await this.refreshAccessTokenIfNeeded()
      assert(this.auth)

      const offerList = await ShopbackAPI.getFollowedOffers(
        this.auth.accessToken,
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
        offerList.offers.slice(0, limit && (limit - offers.length))
      )
      merchants = merchants.concat(offerList.merchants)
    }

    return {
      offers,
      merchants: mergeMerchants(merchants, offers),
    }
  }

  async searchOffers(keyword: string, limit?: number): Promise<OfferList> {
    // Query for 50 offers per search. If this number is greater than 50 then
    // Shopback server responses 15 items only. Not know why.
    const SEARCH_COUNT_PER_PAGE = 50

    let offers: Offer[] = []
    let merchants: ShopbackMerchant[] = []
    let page = 0
    let hasNextPage = true
    while (hasNextPage && limit !== undefined && offers.length < limit) {
      const offerList = await ShopbackAPI.searchOffers(
        keyword,
        page++,
        SEARCH_COUNT_PER_PAGE
      )

      offers = offers.concat(
        // prettier-ignore
        offerList.offers.slice(0, limit && (limit - offers.length))
      )
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
      assert(this.auth)
      await ShopbackAPI.followOffer(offerId, this.auth.accessToken)
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

    assert(this.auth)
    const profile = await ShopbackAPI.getProfile(
      this.auth.accessToken,
      this.auth.clientUserAgent
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
    if (this.auth === undefined) {
      if (this.credPath === undefined) {
        throw new UserNotLoggedInException('No cookies detected.')
      }
      this.loadCredential()
    }

    assert(this.auth)
    const newToken = await ShopbackAPI.refreshAccessToken(
      this.auth.accessToken,
      this.auth.refreshToken,
      this.auth.clientUserAgent
    )
    this.auth.accessToken = newToken.access_token
    this.auth.refreshToken = newToken.refresh_token

    this.tokenExpiredTime = Date.now()
    this.tokenExpiredTime += newToken.expires_in * 1000
    // For safety, shorten the timeout by 10 minutes
    this.tokenExpiredTime -= 10 * 60 * 1000

    this.saveCredential()
  }

  private loadCredential() {
    if (!this.credPath) {
      throw new UserNotLoggedInException('Credential path not specified.')
    }

    // TODO handle read error
    const plainCred = fs.readFileSync(this.credPath, 'utf-8')

    try {
      this.auth = JSON.parse(plainCred)
      if (
        !this.auth?.accessToken ||
        !this.auth?.clientUserAgent ||
        !this.auth?.refreshToken
      ) {
        throw new InvalidCookieError(plainCred)
      }
    } catch (e) {
      // Not a json, so a plain cookie
      this.auth = parsePlainCookie(plainCred)
    }
  }

  private saveCredential() {
    if (!this.credPath) {
      return
    }

    if (!this.auth) {
      throw new UserNotLoggedInException('Cannot save credential: no cookies.')
    }

    fs.writeFileSync(this.credPath, JSON.stringify(this.auth), 'utf-8')
  }
}
