import { mkdirSync } from 'fs'
import cors from 'cors'
import express from 'express'
import { pinoHttp } from 'pino-http'
import { logger } from './logger.js'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'

export const app = express()

app.use(cors())
app.use(express.json())
app.use(
  pinoHttp({
    logger,
    serializers: {
      req: (req) => ({ method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }),
)

app.use('/api/v1', routes)

mkdirSync('uploads/logos', { recursive: true })
app.use('/uploads', express.static('uploads'))

app.use(errorHandler)
