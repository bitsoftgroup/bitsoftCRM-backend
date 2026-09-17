import { app } from './app.js'
import { env } from './env.js'
import { logger } from './logger.js'

app.listen(env.PORT, () => {
  logger.info(`Backend listening on port ${env.PORT}`)
})
