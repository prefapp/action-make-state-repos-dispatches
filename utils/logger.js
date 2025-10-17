// import winston, { format, transports } from 'winston'
const winston = require('winston')

const validLogLevels = ['error', 'warn', 'info', 'debug', 'verbose', 'silly']
let initiated = false
let logger = null

// Type guard to check if a value is a valid LogLevel
function isValidLogLevel(level) {
  return typeof level === 'string' && validLogLevels.includes(level)
}

function initLogger() {
  if (initiated) return

  const logLevel =
    process.env.LOG_LEVEL && isValidLogLevel(process.env.LOG_LEVEL)
      ? process.env.LOG_LEVEL
      : 'info'

  const useJson = String(process.env.CI).toLowerCase() !== 'true'

  const humanFormat = winston.format.printf(info => {
    const level = info[Symbol.for('level')] // raw, not colorized
    const msg =
      typeof info.message === 'string'
        ? info.message
        : JSON.stringify(info.message)

    if (level === 'error') return `::error::${msg}`
    if (level === 'warn') return `::warning::${msg}`
    if (level === 'info') return `::notice::${msg}`

    return `[${info.level}]: ${msg}`
  })

  logger = winston.createLogger({
    level: logLevel,
    exitOnError: false,
    format: useJson
      ? winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.json()
        )
      : winston.format.combine(winston.format.colorize(), humanFormat),
    transports: [new winston.transports.Console({ level: logLevel })]
  })

  initiated = true
}

function doLog(level, args) {
  initLogger()

  const [message, data] = args

  let finalMessage = message

  if (data) {
    try {
      finalMessage = `${finalMessage} | ${JSON.stringify(data?.metadata, null, 2)}`
    } catch (err) {
      console.error(`Serializing ${message}: ${err}`)

      return
    }
  }

  logger[level].apply(logger, [finalMessage])
}

const log = {
  error: (...args) => doLog('error', args),
  warn: (...args) => doLog('warn', args),
  info: (...args) => doLog('info', args),
  debug: (...args) => doLog('debug', args),
  verbose: (...args) => doLog('verbose', args),
  silly: (...args) => doLog('silly', args)
}

module.exports = log
