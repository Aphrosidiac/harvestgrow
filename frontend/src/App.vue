<template>
  <RouterView />
  <BaseToast />
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import BaseToast from './components/base/BaseToast.vue'
import ConfirmDialog from './components/base/ConfirmDialog.vue'
</script>
