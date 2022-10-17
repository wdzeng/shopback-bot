import { CustomError } from 'ts-custom-error'

export class NotLoggedInException extends CustomError {
  constructor() {
    super('User is not logged in.')
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
