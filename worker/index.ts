import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { sampleTrip } from '../src/trip/sampleTrip'
import type { Trip } from '../src/trip/types'

const app = new Hono()

let tripState: Trip = sampleTrip

app.use('/api/*', cors())

app.get('/api/health', (context) =>
  context.json({
    ok: true,
    service: 'trip-ops',
    updatedAt: new Date().toISOString(),
  }),
)

app.get('/api/trip', (context) => context.json(tripState))

app.put('/api/trip', async (context) => {
  const trip = await context.req.json<Trip>()
  tripState = {
    ...trip,
    updatedAt: new Date().toISOString(),
  }
  return context.json(tripState)
})

app.post('/api/trip/reset', (context) => {
  tripState = {
    ...sampleTrip,
    updatedAt: new Date().toISOString(),
  }
  return context.json(tripState)
})

export default app
