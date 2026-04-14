<template>
  <div class="max-w-2xl">
    <div class="flex items-center gap-3 mb-6">
      <button @click="$router.back()" class="text-stone-500 hover:text-stone-700 transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h2 class="text-lg font-semibold text-stone-900">{{ isEdit ? 'Edit Supplier' : 'New Supplier' }}</h2>
    </div>

    <form @submit.prevent="handleSave" class="bg-white border border-stone-200 rounded-xl p-6 space-y-4">
      <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider">Supplier Info</h3>
      <BaseInput v-model="form.companyName" label="Company Name" placeholder="Company name" required />
      <div class="grid sm:grid-cols-2 gap-4">
        <BaseInput v-model="form.contactName" label="Contact Person" placeholder="Contact name" />
        <BaseInput v-model="form.phone" label="Phone" placeholder="+60 12-345 6789" />
      </div>
      <BaseInput v-model="form.email" label="Email" type="email" placeholder="supplier@email.com" />
      <BaseInput v-model="form.address" label="Address" placeholder="Full address" />
      <div class="grid sm:grid-cols-2 gap-4">
        <BaseInput v-model="form.bankName" label="Bank Name" placeholder="e.g. Public Bank" />
        <BaseInput v-model="form.bankAccount" label="Bank Account" placeholder="Account number" />
      </div>
      <BaseInput v-model="form.notes" label="Notes" placeholder="Optional notes" />

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton variant="secondary" type="button" @click="$router.back()">Cancel</BaseButton>
        <BaseButton variant="primary" type="submit" :loading="saving">{{ isEdit ? 'Update' : 'Create' }}</BaseButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import { ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const isEdit = computed(() => !!route.params.id)
const saving = ref(false)

const form = reactive({
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
  address: '',
  bankName: '',
  bankAccount: '',
  notes: '',
})

async function loadSupplier() {
  if (!route.params.id) return
  try {
    const { data } = await api.get(`/suppliers/${route.params.id}`)
    const s = data.data
    form.companyName = s.companyName || ''
    form.contactName = s.contactName || ''
    form.phone = s.phone || ''
    form.email = s.email || ''
    form.address = s.address || ''
    form.bankName = s.bankName || ''
    form.bankAccount = s.bankAccount || ''
    form.notes = s.notes || ''
  } catch {
    toast.error('Failed to load supplier')
    router.push('/app/suppliers')
  }
}

async function handleSave() {
  saving.value = true
  try {
    if (isEdit.value) {
      await api.put(`/suppliers/${route.params.id}`, form)
      toast.success('Supplier updated')
    } else {
      await api.post('/suppliers', form)
      toast.success('Supplier created')
    }
    router.push('/app/suppliers')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to save')
  } finally {
    saving.value = false
  }
}

onMounted(() => loadSupplier())
</script>
