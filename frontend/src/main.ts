import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createHead } from '@unhead/vue'
import router from './router'
import App from './App.vue'
import './assets/css/main.css'

const head = createHead()

const app = createApp(App)
app.use(createPinia())
app.use(head)
app.use(router)
app.mount('#app')
