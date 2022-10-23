import assert from 'node:assert'
import fs from 'node:fs'
import * as ShopbackAPI from './api'
import {
  InvalidCredentialFileException,
  OfferAlreadyFollowedException,
  UserNotInTaiwanException,
  UserNotLoggedInException,
} from './lang/errors'
import { Offer, OfferList, OfferSearchList } from './lang/offer'
import { ShopbackMerchant } from './lang/shopback-api'
import { mergeMerchants, mergeOfferList } from './utils'

export interface IShopbackBot {
  getFollowedOffers(
    limit?: number,
    listener?: FollowedOfferListener
  ): Promise<OfferList>
  searchOffers(
    keywords: string[],
    limit?: number,
    listener?: SearchOfferListener
  ): Promise<OfferList>
  followOffersByKeywords(
    keywords: string[],
    limit?: number,
    listener?: FollowOfferListener
  ): Promise<OfferList>
  validateUserLogin(): Promise<void>
}

interface BotCredential {
  refreshToken: string
  accessToken: string
  clientUserAgent: string
}

function parsePlainCookie(cookieStr: string): BotCredential | null {
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
      case 'profileID':
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

  return null
}

type SearchOfferListener = (offerList: OfferList) => any
type FollowedOfferListener = (OfferList: OfferList, totalCount: number) => any
type FollowOfferListener = (offerList: OfferList, followed: boolean[]) => any

export class ShopbackBot implements IShopbackBot {
  private tokenExpiredTime: null | number = null
  private auth: BotCredential | undefined = undefined

  constructor(private readonly credPath?: string) {}

  async getFollowedOffers(
    limit?: number,
    listener?: FollowedOfferListener
  ): Promise<OfferList> {
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
      await this.refreshAccessToken()
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
        totalCount = offerList.totalCount
      }

      offerList.offers = offerList.offers.slice(
        0,
        // prettier-ignore
        limit && (limit - offers.length)
      )
      offerList.merchants = mergeMerchants(
        offerList.merchants,
        offerList.offers
      )
      listener?.(offerList, totalCount)

      offers = offers.concat(offerList.offers)
      merchants = merchants.concat(offerList.merchants)
    }

    return {
      offers,
      merchants: mergeMerchants(merchants, offers),
    }
  }

  async searchOffers(
    keywords: string[],
    limit?: number,
    listener?: SearchOfferListener
  ): Promise<OfferList> {
    // Query for 50 offers per search. If this number is greater than 50 then
    // Shopback server responses 15 items only. Not know why.
    const SEARCH_COUNT_PER_PAGE = 50
    const offerList: OfferList = { offers: [], merchants: [] }

    for (const keyword of keywords) {
      let page = 0
      let hasNextPage = true
      let offerCount = 0

      while (hasNextPage && limit !== undefined && offerCount < limit) {
        const subOfferList: OfferSearchList = await ShopbackAPI.searchOffers(
          keyword,
          page++,
          SEARCH_COUNT_PER_PAGE
        )

        subOfferList.offers = subOfferList.offers.slice(
          0,
          // prettier-ignore
          limit && (limit - offerCount)
        )
        subOfferList.merchants = mergeMerchants(
          subOfferList.merchants,
          subOfferList.offers
        )

        offerCount += subOfferList.offers.length
        listener?.(subOfferList)
        mergeOfferList(offerList, subOfferList)

        // If Shopback server replies with empty list then break the search.
        // Otherwise this may lead to infinite loop.
        hasNextPage = subOfferList.hasNextPage && subOfferList.offers.length > 0
      }
    }

    return offerList
  }

  private async followOffer(offerId: number, force: boolean): Promise<boolean> {
    await this.refreshAccessToken()
    try {
      assert(this.auth)
      await ShopbackAPI.followOffer(offerId, this.auth.accessToken)
      return true
    } catch (e: unknown) {
      if (e instanceof OfferAlreadyFollowedException) {
        if (force) {
          return false // ignore
        }
      }
      throw e
    }
  }

  async followOffersByKeywords(
    keywords: string[],
    limit?: number,
    listener?: FollowOfferListener
  ): Promise<OfferList> {
    const TASK_COUNT = 50
    const offerList: OfferList = { offers: [], merchants: [] }

    for (const keyword of keywords) {
      const subOfferList: OfferList = { offers: [], merchants: [] }
      const { offers, merchants } = await this.searchOffers([keyword], limit)

      for (let i = 0; i < offers.length; i += TASK_COUNT) {
        const subOffers = offers.slice(i, i + TASK_COUNT)
        const tasks = subOffers.map(x => this.followOffer(x.id, true))
        const taskResult = await Promise.all(tasks)
        const stillSubOfferList: OfferList = {
          offers: subOffers,
          merchants: mergeMerchants(merchants, subOffers),
        }

        listener?.(stillSubOfferList, taskResult)
        mergeOfferList(subOfferList, stillSubOfferList)
      }

      mergeOfferList(offerList, subOfferList)
    }

    return offerList
  }

  async validateUserLogin(): Promise<void> {
    await this.refreshAccessToken()

    assert(this.auth)
    const profile = await ShopbackAPI.getProfile(
      this.auth.accessToken,
      this.auth.clientUserAgent
    )

    if (profile.country !== 'TW') {
      throw new UserNotInTaiwanException()
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const now = Date.now()
    if (this.tokenExpiredTime && now <= this.tokenExpiredTime) {
      return
    }

    if (this.auth === undefined) {
      if (this.credPath === undefined) {
        throw new UserNotLoggedInException('No cookies detected.')
      }
      this.loadCredential()
      assert(this.auth)
    }

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
      throw new InvalidCredentialFileException('Credential path not specified.')
    }

    let plainCred: string
    try {
      plainCred = fs.readFileSync(this.credPath, 'utf-8')
    } catch (e: unknown) {
      if (e instanceof Error) {
        throw new InvalidCredentialFileException(e.message)
      }
      throw e
    }

    try {
      this.auth = JSON.parse(plainCred)
      if (
        !this.auth?.accessToken ||
        !this.auth?.clientUserAgent ||
        !this.auth?.refreshToken
      ) {
        throw new InvalidCredentialFileException(
          'Invalid credential syntax: ' + this.credPath
        )
      }
    } catch (e) {
      const cred = parsePlainCookie(plainCred)
      if (cred === null) {
        throw new InvalidCredentialFileException(
          'Cannot parse cookie: ' + this.credPath
        )
      }
      this.auth = cred
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
