import express, { json } from 'express'
import { StarModelPostgres } from './model/model-posgresql.js'
import cors from 'cors'
import 'dotenv/config'
import { createRouter } from './routes/articleRoutes.js'

const port = process.env.PORT ?? 1234
const app = express()

app.use(json()) // siempre usar esto
app.use(cors())
app.disable('x-powered-by')
app.use('/', createRouter({ model: StarModelPostgres }))

app.listen(port, () => {
  console.log('listening at ' + port)
})
