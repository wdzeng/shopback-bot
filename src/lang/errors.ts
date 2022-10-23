import { CustomError } from 'ts-custom-error'

export class UserNotLoggedInException extends CustomError {
  constructor(msg: string) {
    super(msg)
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

export class InvalidCredentialFileException extends CustomError {
  constructor(msg: string) {
    super(msg)
  }
}

export class UserNotInTaiwanException extends CustomError {
  constructor() {
    super('This user is not in Taiwan.')
  }
}
