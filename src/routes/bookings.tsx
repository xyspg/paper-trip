import { createFileRoute } from '@tanstack/react-router'
import { BookingsPage } from '../pages/BookingsPage'

export const Route = createFileRoute('/bookings')({
  component: BookingsPage,
})
