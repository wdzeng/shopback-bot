import { InvalidCookieError } from "../lang/errors"

export interface BotCredential {
  refreshToken: string
  accessToken: string
  userAgent: string
}

export function parsePlainCookie(cookieStr: string): BotCredential {
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
