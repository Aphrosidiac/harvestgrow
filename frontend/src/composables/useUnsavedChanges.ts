import { ref, onUnmounted } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

export function useUnsavedChanges() {
  const isDirty = ref(false)

  function markDirty() {
    isDirty.value = true
  }

  function markClean() {
    isDirty.value = false
  }

  function beforeUnloadHandler(e: BeforeUnloadEvent) {
    if (isDirty.value) {
      e.preventDefault()
    }
  }

  window.addEventListener('beforeunload', beforeUnloadHandler)

  onBeforeRouteLeave(() => {
    if (isDirty.value) {
      return window.confirm('You have unsaved changes. Leave this page?')
    }
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
  })

  return { isDirty, markDirty, markClean }
}
