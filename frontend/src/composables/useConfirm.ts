import { ref } from 'vue'

interface ConfirmState {
  visible: boolean
  title: string
  message: string
  confirmLabel: string
  confirmVariant: 'primary' | 'danger'
  resolve: ((value: boolean) => void) | null
}

const state = ref<ConfirmState>({
  visible: false,
  title: '',
  message: '',
  confirmLabel: 'Delete',
  confirmVariant: 'danger',
  resolve: null,
})

export function useConfirmStore() {
  return { state }
}

export function useConfirm() {
  function show(
    title: string,
    message: string,
    opts?: { confirmLabel?: string; confirmVariant?: 'primary' | 'danger' }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      state.value = {
        visible: true,
        title,
        message,
        confirmLabel: opts?.confirmLabel ?? 'Delete',
        confirmVariant: opts?.confirmVariant ?? 'danger',
        resolve,
      }
    })
  }

  return { show }
}

export function resolveConfirm(result: boolean) {
  if (state.value.resolve) {
    state.value.resolve(result)
  }
  state.value.visible = false
  state.value.resolve = null
}
