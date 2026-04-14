import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../lib/api'
import type {
  Document, DocumentType, DocumentStatus, DocumentSetting,
  PaymentTerm, PaymentMethod, PaginatedResponse, DocumentFormData,
} from '../types'

export const useDocumentStore = defineStore('documents', () => {
  const documents = ref<Document[]>([])
  const total = ref(0)
  const page = ref(1)
  const limit = ref(20)
  const totalPages = ref(0)
  const loading = ref(false)
  const settings = ref<DocumentSetting[]>([])
  const paymentTerms = ref<PaymentTerm[]>([])

  async function fetchDocuments(params: Record<string, any> = {}) {
    loading.value = true
    try {
      const { data } = await api.get<PaginatedResponse<Document>>('/documents', {
        params: { page: page.value, limit: limit.value, ...params },
      })
      documents.value = data.data
      total.value = data.total
      totalPages.value = data.totalPages
    } finally {
      loading.value = false
    }
  }

  async function getDocument(id: string): Promise<Document> {
    const { data } = await api.get(`/documents/${id}`)
    return data.data
  }

  async function createDocument(formData: DocumentFormData): Promise<Document> {
    const { data } = await api.post('/documents', formData)
    return data.data
  }

  async function updateDocument(id: string, formData: DocumentFormData): Promise<Document> {
    const { data } = await api.put(`/documents/${id}`, formData)
    return data.data
  }

  async function deleteDocument(id: string) {
    await api.delete(`/documents/${id}`)
  }

  async function updateStatus(id: string, status: DocumentStatus): Promise<Document> {
    const { data } = await api.patch(`/documents/${id}/status`, { status })
    return data.data
  }

  async function addPayment(
    id: string,
    payment: { amount: number; paymentMethod: PaymentMethod; referenceNumber?: string; notes?: string; bankName?: string }
  ): Promise<Document> {
    const { data } = await api.post(`/documents/${id}/payments`, payment)
    return data.data
  }

  async function convertDocument(sourceId: string, targetType: DocumentType): Promise<Document> {
    const { data } = await api.post(`/documents/${sourceId}/convert`, { targetType })
    return data.data
  }

  async function fetchSettings() {
    const { data } = await api.get('/document-settings')
    settings.value = data.data
  }

  async function updateSettings(type: DocumentType, payload: Partial<DocumentSetting>) {
    const { data } = await api.put(`/document-settings/${type}`, payload)
    const idx = settings.value.findIndex((s) => s.documentType === type)
    if (idx !== -1) settings.value[idx] = data.data
    return data.data
  }

  async function fetchPaymentTerms() {
    const { data } = await api.get('/payment-terms')
    paymentTerms.value = data.data
  }

  async function createPaymentTerm(payload: { name: string; days: number; description?: string }) {
    const { data } = await api.post('/payment-terms', payload)
    paymentTerms.value.push(data.data)
    return data.data
  }

  async function updatePaymentTerm(id: string, payload: Partial<PaymentTerm>) {
    const { data } = await api.put(`/payment-terms/${id}`, payload)
    const idx = paymentTerms.value.findIndex((t) => t.id === id)
    if (idx !== -1) paymentTerms.value[idx] = data.data
    return data.data
  }

  async function deletePaymentTerm(id: string) {
    await api.delete(`/payment-terms/${id}`)
    paymentTerms.value = paymentTerms.value.filter((t) => t.id !== id)
  }

  // Helpers
  function getDocTypeLabel(type: DocumentType): string {
    const labels: Record<DocumentType, string> = {
      QUOTATION: 'Quotation',
      INVOICE: 'Invoice',
      RECEIPT: 'Receipt',
      DELIVERY_ORDER: 'Delivery Order',
    }
    return labels[type] || type
  }

  function getStatusColor(status: DocumentStatus): string {
    const colors: Record<DocumentStatus, string> = {
      DRAFT: 'gray',
      PENDING: 'blue',
      APPROVED: 'green',
      SENT: 'blue',
      OUTSTANDING: 'gold',
      PARTIAL: 'gold',
      PAID: 'green',
      OVERDUE: 'red',
      COMPLETED: 'green',
      CANCELLED: 'gray',
      VOID: 'red',
    }
    return colors[status] || 'gray'
  }

  return {
    documents, total, page, limit, totalPages, loading, settings, paymentTerms,
    fetchDocuments, getDocument, createDocument, updateDocument, deleteDocument,
    updateStatus, addPayment, convertDocument,
    fetchSettings, updateSettings,
    fetchPaymentTerms, createPaymentTerm, updatePaymentTerm, deletePaymentTerm,
    getDocTypeLabel, getStatusColor,
  }
})
