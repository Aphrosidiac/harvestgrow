import { ref, onUnmounted } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useConfirm } from './useConfirm'

export function useUnsavedChanges() {
  const isDirty = ref(false)
  const confirm = useConfirm()
  const router = useRouter()
  let allowLeave = false

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

  onBeforeRouteLeave(async (to) => {
    if (!isDirty.value || allowLeave) return true
    const ok = await confirm.show(
      'Unsaved Changes',
      'You have unsaved changes. Leave this page?',
      { confirmLabel: 'Leave', confirmVariant: 'danger' }
    )
    if (ok) {
      allowLeave = true
      isDirty.value = false
      router.push(to.fullPath)
      return false
    }
    return false
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler)
  })

  return { isDirty, markDirty, markClean }
}
