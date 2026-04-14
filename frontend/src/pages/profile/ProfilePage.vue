<template>
  <div class="max-w-3xl">
    <div v-if="loading" class="text-stone-500">Loading profile...</div>

    <template v-else-if="profile">
      <!-- Profile Info -->
      <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <div class="flex items-center gap-5 mb-6">
          <div class="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center">
            <span class="text-green-600 text-xl font-bold">{{ userInitials }}</span>
          </div>
          <div>
            <h2 class="text-xl font-semibold text-stone-900">{{ profile.name }}</h2>
            <p class="text-stone-500 text-sm">{{ profile.email }}</p>
            <BaseBadge :color="profile.role === 'ADMIN' ? 'gold' : 'gray'" class="mt-1">{{ profile.role }}</BaseBadge>
          </div>
        </div>

        <div class="grid sm:grid-cols-2 gap-4 pt-4 border-t border-stone-200">
          <div>
            <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">Branch</p>
            <p class="text-stone-700 text-sm">{{ profile.branch?.name }}</p>
            <p class="text-stone-500 text-xs">{{ profile.branch?.code }}</p>
          </div>
          <div>
            <p class="text-stone-500 text-xs uppercase tracking-wider mb-1">Member Since</p>
            <p class="text-stone-700 text-sm">{{ new Date(profile.createdAt).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
          </div>
        </div>
      </div>

      <!-- Branch Settings (Admin only) -->
      <div v-if="profile.role === 'ADMIN'" class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Branch / Company Details</h3>
        <form @submit.prevent="handleUpdateBranch" class="space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <BaseInput v-model="branchForm.name" label="Branch Name" required />
            <div>
              <label class="block text-sm font-medium text-stone-700 mb-1.5">Branch Code</label>
              <p class="text-stone-500 text-sm py-2.5 px-3 bg-stone-200 border border-stone-300 rounded-lg opacity-60">{{ profile.branch?.code }}</p>
            </div>
          </div>
          <BaseInput v-model="branchForm.address" label="Address" />
          <div class="grid sm:grid-cols-2 gap-4">
            <BaseInput v-model="branchForm.phone" label="Phone" />
            <BaseInput v-model="branchForm.email" label="Email" type="email" />
          </div>
          <BaseInput v-model="branchForm.ssmNumber" label="SSM / Registration Number" placeholder="e.g. 202401043458 / 1413766-V" />
          <div class="grid sm:grid-cols-2 gap-4">
            <BaseInput v-model="branchForm.bankName" label="Bank Name" placeholder="e.g. PUBLIC BANK" />
            <BaseInput v-model="branchForm.bankAccount" label="Bank Account Number" placeholder="e.g. 3228 486 517" />
          </div>
          <div class="flex justify-end">
            <BaseButton variant="primary" type="submit" :loading="savingBranch" :disabled="!branchChanged">
              Save Branch Details
            </BaseButton>
          </div>
        </form>
      </div>

      <!-- Edit Profile -->
      <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Edit Profile</h3>
        <form @submit.prevent="handleUpdateProfile" class="space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <BaseInput v-model="editForm.name" label="Full Name" required />
            <BaseInput v-model="editForm.email" label="Email" type="email" required />
          </div>
          <div class="flex justify-end">
            <BaseButton variant="primary" type="submit" :loading="savingProfile" :disabled="!profileChanged">
              Save Changes
            </BaseButton>
          </div>
        </form>
      </div>

      <!-- Change Password -->
      <div class="bg-white border border-stone-200 rounded-xl p-6 mb-6">
        <h3 class="text-sm font-semibold text-stone-700 uppercase tracking-wider mb-4">Change Password</h3>
        <form @submit.prevent="handleChangePassword" class="space-y-4">
          <BaseInput v-model="passwordForm.currentPassword" label="Current Password" type="password" required />
          <div class="grid sm:grid-cols-2 gap-4">
            <BaseInput v-model="passwordForm.newPassword" label="New Password" type="password" required />
            <BaseInput v-model="passwordForm.confirmPassword" label="Confirm New Password" type="password" required :error="passwordMismatch ? 'Passwords do not match' : ''" />
          </div>
          <div class="flex justify-end">
            <BaseButton variant="primary" type="submit" :loading="savingPassword" :disabled="!passwordValid">
              Change Password
            </BaseButton>
          </div>
        </form>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white border border-red-900/30 rounded-xl p-6">
        <h3 class="text-sm font-semibold text-red-400 uppercase tracking-wider mb-2">Session</h3>
        <p class="text-stone-500 text-sm mb-4">Sign out from this device.</p>
        <BaseButton variant="danger" size="sm" @click="handleLogout">
          <LogOut class="w-4 h-4 mr-1.5" /> Sign Out
        </BaseButton>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import api from '../../lib/api'
import BaseInput from '../../components/base/BaseInput.vue'
import BaseButton from '../../components/base/BaseButton.vue'
import BaseBadge from '../../components/base/BaseBadge.vue'
import { LogOut } from 'lucide-vue-next'

interface ProfileData {
  id: string
  email: string
  name: string
  role: string
  branchId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  branch?: { id: string; name: string; code: string; address?: string; phone?: string; email?: string; ssmNumber?: string; bankName?: string; bankAccount?: string }
}

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const profile = ref<ProfileData | null>(null)
const loading = ref(true)
const savingProfile = ref(false)
const savingPassword = ref(false)
const savingBranch = ref(false)

const editForm = reactive({ name: '', email: '' })
const passwordForm = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const branchForm = reactive({ name: '', address: '', phone: '', email: '', ssmNumber: '', bankName: '', bankAccount: '' })

const userInitials = computed(() => {
  const name = profile.value?.name || ''
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
})

const profileChanged = computed(() =>
  editForm.name !== profile.value?.name || editForm.email !== profile.value?.email
)

const passwordMismatch = computed(() =>
  passwordForm.confirmPassword.length > 0 && passwordForm.newPassword !== passwordForm.confirmPassword
)

const passwordValid = computed(() =>
  passwordForm.currentPassword.length > 0 &&
  passwordForm.newPassword.length >= 6 &&
  passwordForm.newPassword === passwordForm.confirmPassword
)

const branchChanged = computed(() =>
  branchForm.name !== (profile.value?.branch?.name || '') ||
  branchForm.address !== (profile.value?.branch?.address || '') ||
  branchForm.phone !== (profile.value?.branch?.phone || '') ||
  branchForm.email !== (profile.value?.branch?.email || '') ||
  branchForm.ssmNumber !== (profile.value?.branch?.ssmNumber || '') ||
  branchForm.bankName !== (profile.value?.branch?.bankName || '') ||
  branchForm.bankAccount !== (profile.value?.branch?.bankAccount || '')
)

async function loadProfile() {
  loading.value = true
  try {
    const { data } = await api.get('/profile')
    profile.value = data.data
    editForm.name = data.data.name
    editForm.email = data.data.email
    branchForm.name = data.data.branch?.name || ''
    branchForm.address = data.data.branch?.address || ''
    branchForm.phone = data.data.branch?.phone || ''
    branchForm.email = data.data.branch?.email || ''
    branchForm.ssmNumber = data.data.branch?.ssmNumber || ''
    branchForm.bankName = data.data.branch?.bankName || ''
    branchForm.bankAccount = data.data.branch?.bankAccount || ''
  } catch {
    toast.error('Failed to load profile')
  } finally {
    loading.value = false
  }
}

async function handleUpdateProfile() {
  savingProfile.value = true
  try {
    const { data } = await api.put('/profile', { name: editForm.name, email: editForm.email })
    profile.value = { ...profile.value!, ...data.data }
    // Update auth store
    if (auth.user) {
      auth.user.name = data.data.name
      auth.user.email = data.data.email
    }
    toast.success('Profile updated')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to update profile')
  } finally {
    savingProfile.value = false
  }
}

async function handleChangePassword() {
  savingPassword.value = true
  try {
    await api.put('/profile/password', {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    toast.success('Password changed successfully')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to change password')
  } finally {
    savingPassword.value = false
  }
}

async function handleUpdateBranch() {
  savingBranch.value = true
  try {
    const { data } = await api.put('/profile/branch', branchForm)
    if (profile.value) {
      profile.value.branch = data.data
    }
    toast.success('Branch details updated')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Failed to update branch')
  } finally {
    savingBranch.value = false
  }
}

function handleLogout() {
  auth.logout()
  router.push('/admin/login')
}

onMounted(() => loadProfile())
</script>
