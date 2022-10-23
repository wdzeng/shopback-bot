import { Command } from 'commander'
import * as ExitCode from './lang/exit-code'
import { OfferList } from './lang/offer'
import { ShopbackBot } from './shopback-bot'
import { toNonNegativeInt } from './utils'

type JsonOption = { json: boolean }
type LimitOption = { limit: number }
type CredentialOption = { credential: string }

type SearchOption = JsonOption & LimitOption
async function search(keywords: string[], options: SearchOption) {
  const bot = new ShopbackBot()
  function listener(offers: OfferList) {
    for (const offer of offers.offers) {
      console.log('* ' + offer.title)
      console.log('  ' + offer.imageUrl)
    }
  }

  const searchResult = await bot.searchOffers(
    keywords,
    options.limit || undefined,
    options.json ? undefined : listener
  )
  if (options.json) {
    console.log(JSON.stringify(searchResult))
  }
}

type ListOption = JsonOption & LimitOption & CredentialOption
async function list(options: ListOption) {
  const bot = new ShopbackBot(options.credential)
  function listener(offers: OfferList) {
    for (const offer of offers.offers) {
      console.log('* ' + offer.title)
    }
  }

  const offers = await bot.getFollowedOffers(
    options.limit || undefined,
    options.json ? undefined : listener
  )
  if (options.json) {
    console.log(JSON.stringify(offers))
  }
}

const version = '0.0.0'
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
  .action(search)

mainProgram
  .command('list')
  .description('List my offers.')
  .option('-n, --limit <INT>', 'list at most N offers', toNonNegativeInt, 0)
  .option('-J, --json', 'output JSON format', false)
  .requiredOption('-c, --credential <FILE>', 'credential file')
  .action(list)

mainProgram.parse()
