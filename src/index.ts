import { Command } from 'commander'
import * as ExitCode from './lang/exit-code'
import { OfferList } from './lang/offer'
import { ShopbackBot } from './shopback-bot'
import { handleError, toNonNegativeInt } from './utils'

type JsonOption = { json: boolean }
type LimitOption = { limit: number }
type CredentialOption = { credential: string }
type ForceOption = { force: boolean }

type SearchOption = JsonOption & LimitOption & ForceOption
async function search(keywords: string[], options: SearchOption) {
  function listener(offers: OfferList) {
    for (const offer of offers.offers) {
      console.log('* ' + offer.title)
      console.log('  ' + offer.imageUrl)
    }
  }

  let result: OfferList

  try {
    const bot = new ShopbackBot()
    result = await bot.searchOffers(
      keywords,
      options.limit || undefined,
      options.json ? undefined : listener
    )
  } catch (e: unknown) {
    handleError(e)
  }

  if (options.json) {
    console.log(JSON.stringify(result))
  } else {
    if (result.offers.length === 0) {
      console.error('No offers found.')
    }
  }

  if (result.offers.length === 0 && !options.force) {
    process.exit(ExitCode.EMPTY_OFFER_RESULT)
  }
}

type ListOption = JsonOption & LimitOption & CredentialOption & ForceOption
async function list(options: ListOption) {
  function listener(offers: OfferList) {
    for (const offer of offers.offers) {
      console.log('* ' + offer.title)
    }
  }

  let result: OfferList
  try {
    const bot = new ShopbackBot(options.credential)
    await bot.validateUserLogin()

    result = await bot.getFollowedOffers(
      options.limit || undefined,
      options.json ? undefined : listener
    )
  } catch (e: unknown) {
    handleError(e)
  }

  if (options.json) {
    console.log(JSON.stringify(result))
  } else {
    if (result.offers.length === 0) {
      console.log('No offers found.')
    }
  }
  if (result.offers.length === 0 && !options.force) {
    process.exit(ExitCode.EMPTY_OFFER_RESULT)
  }
}

type FollowOptions = JsonOption & LimitOption & CredentialOption & ForceOption
async function follow(keywords: string[], options: FollowOptions) {
  function listener(offers: OfferList, followed: boolean[]) {
    for (let i = 0; i < offers.offers.length; i++) {
      const msg = (followed[i] ? '[+] ' : '[#] ') + offers.offers[i].title
      console.log(msg)
    }
  }

  let result: OfferList
  try {
    const bot = new ShopbackBot(options.credential)
    await bot.validateUserLogin()

    result = await bot.followOffersByKeywords(
      keywords,
      options.limit || undefined,
      options.json ? undefined : listener
    )
  } catch (e: unknown) {
    handleError(e)
  }

  if (options.json) {
    console.log(JSON.stringify(result))
  } else {
    if (result.offers.length === 0) {
      console.log('No offers found.')
    }
  }

  if (result.offers.length === 0 && !options.force) {
    process.exit(ExitCode.EMPTY_OFFER_RESULT)
  }
}

const version = '1.0.0'
const majorVersion = version.split('.')[0]
const program = new Command()
const mainProgram = program
  .name(`docker run hyperbola/shopback-bot:${majorVersion}`)
  .description('A bot for Shopback.')
  .version(version)
  .allowExcessArguments(false)
  .exitOverride(e =>
    process.exit(e.exitCode === 1 ? ExitCode.INVALID_OPTIONS : e.exitCode)
  )

mainProgram
  .command('search')
  .description('Search offers.')
  .argument('<keyword...>', 'keyword to search')
  .option(
    '-n, --limit <INT>',
    'search at most N offers for each keyword',
    toNonNegativeInt,
    10
  )
  .option('-J, --json', 'output JSON format', false)
  .option('-f, --force', 'suppress error if no ay offer is followed', false)
  .action(search)

mainProgram
  .command('list')
  .description('List my offers.')
  .requiredOption('-c, --credential <FILE>', 'credential file')
  .option('-n, --limit <INT>', 'list at most N offers', toNonNegativeInt, 0)
  .option('-J, --json', 'output JSON format', false)
  .option('-f, --force', 'suppress error if no ay offer is followed', false)
  .action(list)

mainProgram
  .command('follow')
  .description('Follow offer(s).')
  .argument('<keyword...>', 'keyword to search')
  .requiredOption('-c, --credential <FILE>', 'credential file')
  .option('-n, --limit <INT>', 'list at most N offers', toNonNegativeInt, 0)
  .option(
    '-n, --limit <INT>',
    'search at most N offers for each keyword',
    toNonNegativeInt,
    1
  )
  .option('-f, --force', 'suppress error if no ay offer is followed', false)
  .action(follow)

mainProgram.parse()
