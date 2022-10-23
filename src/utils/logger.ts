type Level = 1 | 2 | 3
export const ERROR: Level = 3
export const WARNING: Level = 2
export const INFO: Level = 1
export let level: Level = INFO

export function error(msg: string) {
  if (ERROR >= level) {
    console.error(msg)
  }
}

export function warn(msg: string) {
  if (WARNING >= level) {
    console.error(msg)
  }
}

export function info(msg: string) {
  if (INFO >= level) {
    console.error(msg)
  }
}

export function debug(msg: string) {
  if (process.env['DEBUG']) {
    console.error(msg)
  }
}
