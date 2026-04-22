<template>
  <BaseModal v-model="state.visible" :title="state.title" size="sm">
    <p class="text-stone-600 text-sm">{{ state.message }}</p>
    <template #footer>
      <BaseButton variant="secondary" @click="handleCancel">Cancel</BaseButton>
      <BaseButton :variant="state.confirmVariant" @click="handleConfirm">
        {{ state.confirmLabel }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'
import { useConfirmStore, resolveConfirm } from '../../composables/useConfirm'

const { state } = useConfirmStore()

function handleConfirm() {
  resolveConfirm(true)
}

function handleCancel() {
  resolveConfirm(false)
}
</script>
