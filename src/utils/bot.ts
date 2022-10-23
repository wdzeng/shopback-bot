import fs from 'node:fs'
import { mergeMerchants } from './merchants'
import { InvalidCookieError } from '../lang/errors'
import { OfferListFollowResult, SearchedOffer } from '../lang/offer'
import { IShopbackBot, ShopbackBot } from '../shopback-bot'

export async function followOffersByKeyword(
  bot: IShopbackBot,
  keyword: string,
  size: number,
  parallel: number
): Promise<OfferListFollowResult> {
  const searchList = await bot.searchOffers(keyword, size)

  for (let i = 0; i < searchList.offers.length; i += parallel) {
    const offers = searchList.offers.slice(i, i + parallel)
    const tasks = offers.map(o => bot.followOffer(o.id, true))
    const results = await Promise.all(tasks)
    for (let j = 0; j < offers.length; j++) {
      const tmp = searchList.offers[i + j] as SearchedOffer
      tmp.newFollowed = results[j]
    }
  }

  return searchList as OfferListFollowResult
}

export interface BotCredential {
  refreshToken: string
  accessToken: string
  clientUserAgent: string
}

export function parsePlainCookie(cookieStr: string): BotCredential {
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

export function buildBotFromCredential(credPath: string): IShopbackBot {
  const plainCred = fs.readFileSync(credPath, 'utf-8')
  let cred: BotCredential
  try {
    cred = JSON.parse(plainCred)
  } catch (e) {
    // Not a json, so a plain cookie
    cred = parsePlainCookie(plainCred)
  }
  return new ShopbackBot(cred)
}
