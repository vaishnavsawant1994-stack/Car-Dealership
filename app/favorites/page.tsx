import type { Metadata } from 'next'
import { SavedVehiclesPage } from '@/components/account/SavedVehiclesPage'

export const metadata: Metadata = { title: 'Saved Vehicles | Car Dealership Demo', description: 'Review vehicles saved to your Car Dealership Demo garage.' }

export default function FavoritesPage() {
  return <SavedVehiclesPage />
}
