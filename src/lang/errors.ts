import { CustomError } from 'ts-custom-error'

export class UserNotLoggedInException extends CustomError {
  constructor(msg: string) {
    super(msg)
  }
}

export class InvalidCookieError extends CustomError {
  constructor(public cookie: string) {
    super('Cannot parse cookie.')
  }
}

export class OfferAlreadyFollowedException extends CustomError {
  constructor(public offerId: number) {
    super('Offer already followed: ' + offerId)
  }
}

export class OfferNotFoundException extends CustomError {
  constructor(public offerId: number) {
    super('Offer not found: ' + offerId)
  }
}
