import { InvalidArgumentError } from 'commander'

export function toNonNegativeInt(value: string) {
  const parsedValue = Number(value)
  if (!Number.isFinite(parsedValue)) {
    throw new InvalidArgumentError('Invalid value.')
  }
  if (!Number.isInteger(parsedValue)) {
    throw new InvalidArgumentError('Not an integer.')
  }
  if (parsedValue < 0) {
    throw new InvalidArgumentError('Not a positive number.')
  }
  return parsedValue
}
