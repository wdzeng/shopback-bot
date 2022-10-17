import fs from 'node:fs'
import { AxiosError } from 'axios'
import * as ShopbackAPI from './api'
import {
  InvalidCookieError,
  OfferAlreadyFollowedException,
  OfferNotFoundException,
} from './lang/errors'
import {
  FollowedSearchedOfferList,
  Offer,
  OfferList,
  SearchedOffer,
} from './lang/offer'
import { ShopbackErrorResponse, ShopbackMerchant } from './lang/shopback-api'
import { mergeMerchants, sleep } from './utils'

export interface IShopbackBot {
  getFollowedOffers(): Promise<OfferList>
  searchOffers(keyword: string, count: number): Promise<OfferList>
  followOffer(offerId: number, force: boolean): Promise<boolean>
  followOffers(
    keyword: string,
    size: number,
    parallel: number
  ): Promise<FollowedSearchedOfferList>
  checkLoginAndGetUsername(): Promise<string>
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
      // TODO: remove unused merchant IDs
      merchants: mergeMerchants(merchants),
    }
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

  async checkLoginAndGetUsername(): Promise<string> {
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

  async followOffers(
    keyword: string,
    size: number,
    parallel: number
  ): Promise<FollowedSearchedOfferList> {
    const searchList = await this.searchOffers(keyword, size)

    for (let i = 0; i < searchList.offers.length; i += parallel) {
      const offers = searchList.offers.slice(i, i + parallel)
      const tasks = offers.map(o => this.followOffer(o.id, true))
      const results = await Promise.all(tasks)
      for (let j = 0; j < offers.length; j++) {
        const tmp = searchList.offers[i + j] as SearchedOffer
        tmp.newFollowed = results[j]
      }
    }

    return searchList as FollowedSearchedOfferList
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

interface BotCredential {
  refreshToken: string
  accessToken: string
  userAgent: string
}

function parsePlainCookie(cookieStr: string): BotCredential {
  const firstLine = cookieStr.split('\n')[0].trim()
  const cookies = firstLine.split(';')

  let accessToken = ''
  let refreshToken = ''
  let userAgent = ''
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
        userAgent = value
        break
      case 'sbet':
        accessToken = value
        break
      case 'sbrefresh': // cspell:disable-line
        refreshToken = value
        break
    }
  }

  if (accessToken && refreshToken && userAgent) {
    return { accessToken, refreshToken, userAgent }
  }

  throw new InvalidCookieError(cookieStr)
}

export function buildBotFromCredential(credPath: string): ShopbackBot {
  const plainCred = fs.readFileSync(credPath, 'utf-8')
  let cred: BotCredential
  try {
    cred = JSON.parse(plainCred)
  } catch (e) {
    // Not a json, so a plain cookie
    cred = parsePlainCookie(plainCred)
  }
  return new ShopbackBot(cred.accessToken, cred.refreshToken, cred.userAgent)
}
