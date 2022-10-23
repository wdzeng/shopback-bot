import { InvalidCookieError } from "../lang/errors"

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
