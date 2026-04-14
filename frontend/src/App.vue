<template>
  <RouterView />
  <BaseToast />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import BaseToast from './components/base/BaseToast.vue'
</script>
