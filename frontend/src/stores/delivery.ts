import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'
import type { DeliveryTrip, Driver, ReadyOrderForDispatch, DeliveryAlerts } from '../types'

export const useDeliveryStore = defineStore('delivery', () => {
  const drivers = ref<Driver[]>([])
  const readyOrders = ref<ReadyOrderForDispatch[]>([])
  const readyGrouped = ref<Record<string, ReadyOrderForDispatch[]>>({ AM: [], PM: [] })
  const trips = ref<DeliveryTrip[]>([])
  const currentTrip = ref<DeliveryTrip | null>(null)
  const myTrip = ref<DeliveryTrip | null>(null)
  const myTrips = ref<DeliveryTrip[]>([])
  const alerts = ref<DeliveryAlerts>({ unassigned: [], overdue: [], failed: [] })
  const loading = ref(false)

  // ─── Drivers ─────────────────────────────────
  async function fetchDrivers() {
    const { data } = await api.get('/delivery/drivers')
    drivers.value = data.data
    return drivers.value
  }

  async function createDriver(payload: { userId: string; vehiclePlate?: string; phone?: string }) {
    const { data } = await api.post('/delivery/drivers', payload)
    return data.data as Driver
  }

  async function updateDriver(id: string, payload: { vehiclePlate?: string; phone?: string; active?: boolean }) {
    const { data } = await api.patch(`/delivery/drivers/${id}`, payload)
    return data.data as Driver
  }

  // ─── Dispatcher: ready + trips ───────────────
  async function fetchReadyOrders(date?: string) {
    const { data } = await api.get('/delivery/ready-orders', { params: { date } })
    readyOrders.value = data.data.orders
    readyGrouped.value = data.data.grouped
    return data.data
  }

  async function createTrip(payload: { driverId: string; date: string; slot: string; orderIds: string[] }) {
    const { data } = await api.post('/delivery/trips', payload)
    return data.data as DeliveryTrip
  }

  async function fetchTrips(date?: string) {
    loading.value = true
    try {
      const { data } = await api.get('/delivery/trips', { params: { date } })
      trips.value = data.data
      return trips.value
    } finally { loading.value = false }
  }

  async function fetchTripDetail(id: string) {
    const { data } = await api.get(`/delivery/trips/${id}`)
    currentTrip.value = data.data
    return data.data as DeliveryTrip
  }

  async function updateStopSequence(stopId: string, sequence: number) {
    await api.patch(`/delivery/stops/${stopId}/sequence`, { sequence })
  }

  async function removeStop(stopId: string) {
    await api.delete(`/delivery/stops/${stopId}`)
  }

  async function cancelTrip(tripId: string) {
    await api.post(`/delivery/trips/${tripId}/cancel`)
  }

  async function fetchAlerts(date?: string) {
    const { data } = await api.get('/delivery/alerts', { params: { date } })
    alerts.value = data.data
    return alerts.value
  }

  // ─── Driver self ─────────────────────────────
  async function fetchMyTrip(date?: string, slot?: string) {
    const { data } = await api.get('/delivery/me/trip', { params: { date, slot } })
    myTrip.value = data.data.trip
    myTrips.value = data.data.trips
    return data.data
  }

  async function startMyTrip(tripId: string) {
    await api.post(`/delivery/me/trip/${tripId}/start`)
  }

  async function stopArrived(stopId: string) {
    await api.post(`/delivery/me/stops/${stopId}/arrived`)
  }

  async function stopDelivered(stopId: string, payload: { receivedByName: string; signatureDataUrl: string; proofPhotoUrl?: string; notes?: string }) {
    await api.post(`/delivery/me/stops/${stopId}/delivered`, payload)
  }

  async function stopFailed(stopId: string, payload: { failureReason: string; notes?: string }) {
    await api.post(`/delivery/me/stops/${stopId}/failed`, payload)
  }

  async function stopSkipped(stopId: string, notes?: string) {
    await api.post(`/delivery/me/stops/${stopId}/skipped`, { notes })
  }

  return {
    drivers, readyOrders, readyGrouped, trips, currentTrip, myTrip, myTrips, alerts, loading,
    fetchDrivers, createDriver, updateDriver,
    fetchReadyOrders, createTrip, fetchTrips, fetchTripDetail,
    updateStopSequence, removeStop, cancelTrip, fetchAlerts,
    fetchMyTrip, startMyTrip, stopArrived, stopDelivered, stopFailed, stopSkipped,
  }
})
