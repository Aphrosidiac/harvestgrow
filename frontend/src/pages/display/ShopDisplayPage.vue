<template>
  <div :class="['h-screen w-screen overflow-hidden flex flex-col font-sans select-none transition-colors duration-300', dark ? 'bg-[#111318]' : 'bg-gray-100']">
    <!-- Header Bar -->
    <header :class="['flex items-center justify-between px-4 lg:px-8 py-3 border-b transition-colors duration-300 flex-wrap gap-2', dark ? 'bg-[#161920] border-white/8' : 'bg-white border-gray-200 shadow-sm']">
      <div class="flex items-center gap-4">
        <img src="/logo-nav.png" alt="HarvestGrow" class="h-7" />
        <div :class="['h-5 w-px', dark ? 'bg-white/10' : 'bg-gray-300']"></div>
        <h1 :class="['text-xs font-medium tracking-[0.3em] uppercase', dark ? 'text-white/60' : 'text-gray-400']">Workshop Live</h1>
      </div>
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-5 text-xs">
          <span :class="dark ? 'text-white/40' : 'text-gray-400'">{{ totalJobs }} Jobs</span>
          <span class="text-amber-500 font-medium">{{ waitingCount }} Waiting</span>
          <span class="text-blue-500 font-medium">{{ inProgressCount }} In Progress</span>
          <span class="text-emerald-500 font-medium">{{ readyCount }} Ready</span>
        </div>
        <div :class="['h-5 w-px', dark ? 'bg-white/10' : 'bg-gray-300']"></div>
        <!-- Theme toggle -->
        <button @click="dark = !dark" :class="['w-8 h-8 rounded-lg flex items-center justify-center transition-colors', dark ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']">
          <svg v-if="dark" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        </button>
        <div class="text-right">
          <p :class="['text-sm font-semibold tabular-nums', dark ? 'text-white/90' : 'text-gray-800']">{{ currentTime }}</p>
          <p :class="['text-[10px]', dark ? 'text-white/30' : 'text-gray-400']">{{ currentDate }}</p>
        </div>
      </div>
    </header>

    <!-- Columns by Status -->
    <main class="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">
      <!-- Waiting Column -->
      <section :class="['flex-1 flex flex-col border-b lg:border-b-0 lg:border-r min-w-0 transition-colors duration-300', dark ? 'border-white/8' : 'border-gray-200']">
        <div :class="['px-4 py-2.5 border-b flex items-center gap-2 transition-colors duration-300', dark ? 'bg-amber-500/8 border-amber-500/10' : 'bg-amber-50 border-amber-200/50']">
          <span class="w-2 h-2 rounded-full bg-amber-400"></span>
          <span class="text-amber-500 text-xs font-semibold uppercase tracking-wider">Waiting</span>
          <span :class="['text-xs ml-auto', dark ? 'text-amber-400/40' : 'text-amber-400/60']">{{ waitingCount }}</span>
        </div>
        <div :class="['flex-1 overflow-y-auto p-3 space-y-2 transition-colors duration-300', dark ? 'bg-[#111318]' : 'bg-gray-50/50']">
          <div
            v-for="job in waitingJobs"
            :key="job.id"
            :class="['rounded-lg p-3.5 transition-colors duration-300', dark ? 'bg-[#1a1d25] border border-amber-500/10' : 'bg-white border border-amber-200/40 shadow-sm']"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span :class="['font-bold text-base tracking-wider font-mono', dark ? 'text-white' : 'text-gray-900']">{{ job.plate }}</span>
              <span :class="['text-xs tabular-nums', dark ? 'text-white/30' : 'text-gray-400']">{{ formatElapsed(job.elapsed) }}</span>
            </div>
            <p :class="['text-xs mb-1', dark ? 'text-white/40' : 'text-gray-400']">{{ job.vehicle }}</p>
            <p :class="['text-xs mb-2.5 font-medium', dark ? 'text-white/60' : 'text-gray-600']">{{ job.customer }}</p>
            <div class="space-y-1 mb-2.5">
              <p v-for="(s, i) in job.services" :key="i" :class="['text-xs', dark ? 'text-white/50' : 'text-gray-500']">{{ s }}</p>
            </div>
            <div :class="['flex items-center gap-1.5 pt-2.5 border-t', dark ? 'border-white/8' : 'border-gray-100']">
              <div class="w-5 h-5 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center text-[10px] font-bold">{{ job.foreman.charAt(0) }}</div>
              <span :class="['text-xs', dark ? 'text-white/40' : 'text-gray-400']">{{ job.foreman }}</span>
            </div>
          </div>
          <div v-if="!waitingJobs.length" :class="['text-xs text-center py-8', dark ? 'text-white/15' : 'text-gray-300']">No waiting jobs</div>
        </div>
      </section>

      <!-- In Progress Column -->
      <section :class="['flex-[2] flex flex-col border-b lg:border-b-0 lg:border-r min-w-0 transition-colors duration-300', dark ? 'border-white/8' : 'border-gray-200']">
        <div :class="['px-4 py-2.5 border-b flex items-center gap-2 transition-colors duration-300', dark ? 'bg-blue-500/8 border-blue-500/10' : 'bg-blue-50 border-blue-200/50']">
          <span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
          <span class="text-blue-500 text-xs font-semibold uppercase tracking-wider">In Progress</span>
          <span :class="['text-xs ml-auto', dark ? 'text-blue-400/40' : 'text-blue-400/60']">{{ inProgressCount }}</span>
        </div>
        <div :class="['flex-1 overflow-y-auto p-3 transition-colors duration-300', dark ? 'bg-[#111318]' : 'bg-gray-50/50']">
          <div class="grid grid-cols-1 xl:grid-cols-2 gap-2">
            <div
              v-for="job in progressJobs"
              :key="job.id"
              :class="['rounded-lg p-3.5 transition-colors duration-300', dark ? 'bg-[#1a1d25] border border-blue-500/10' : 'bg-white border border-blue-200/40 shadow-sm']"
            >
              <div class="flex items-center justify-between mb-1.5">
                <span :class="['font-bold text-base tracking-wider font-mono', dark ? 'text-white' : 'text-gray-900']">{{ job.plate }}</span>
                <span :class="['text-xs tabular-nums', job.elapsed > 120 ? 'text-red-500 font-medium' : dark ? 'text-white/30' : 'text-gray-400']">{{ formatElapsed(job.elapsed) }}</span>
              </div>
              <p :class="['text-xs mb-1', dark ? 'text-white/40' : 'text-gray-400']">{{ job.vehicle }}</p>
              <p :class="['text-xs mb-2.5 font-medium', dark ? 'text-white/60' : 'text-gray-600']">{{ job.customer }}</p>
              <div class="space-y-1 mb-2.5">
                <p v-for="(s, i) in job.services" :key="i" :class="['text-xs', dark ? 'text-white/50' : 'text-gray-500']">{{ s }}</p>
              </div>
              <div :class="['flex items-center gap-1.5 pt-2.5 border-t', dark ? 'border-white/8' : 'border-gray-100']">
                <div class="w-5 h-5 rounded-full bg-blue-500/15 text-blue-500 flex items-center justify-center text-[10px] font-bold">{{ job.foreman.charAt(0) }}</div>
                <span :class="['text-xs', dark ? 'text-white/40' : 'text-gray-400']">{{ job.foreman }}</span>
              </div>
            </div>
          </div>
          <div v-if="!progressJobs.length" :class="['text-xs text-center py-8', dark ? 'text-white/15' : 'text-gray-300']">No jobs in progress</div>
        </div>
      </section>

      <!-- Ready Column -->
      <section class="flex-1 flex flex-col min-w-0">
        <div :class="['px-4 py-2.5 border-b flex items-center gap-2 transition-colors duration-300', dark ? 'bg-emerald-500/8 border-emerald-500/10' : 'bg-emerald-50 border-emerald-200/50']">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span class="text-emerald-500 text-xs font-semibold uppercase tracking-wider">Ready</span>
          <span :class="['text-xs ml-auto', dark ? 'text-emerald-400/40' : 'text-emerald-400/60']">{{ readyCount }}</span>
        </div>
        <div :class="['flex-1 overflow-y-auto p-3 space-y-2 transition-colors duration-300', dark ? 'bg-[#111318]' : 'bg-gray-50/50']">
          <div
            v-for="job in readyJobs"
            :key="job.id"
            :class="['rounded-lg p-3.5 transition-colors duration-300', dark ? 'bg-[#1a1d25] border border-emerald-500/10' : 'bg-white border border-emerald-200/40 shadow-sm']"
          >
            <div class="flex items-center justify-between mb-1.5">
              <span :class="['font-bold text-base tracking-wider font-mono', dark ? 'text-white' : 'text-gray-900']">{{ job.plate }}</span>
              <span :class="['text-xs tabular-nums', dark ? 'text-emerald-400/50' : 'text-emerald-500/60']">{{ formatElapsed(job.elapsed) }}</span>
            </div>
            <p :class="['text-xs mb-1', dark ? 'text-white/40' : 'text-gray-400']">{{ job.vehicle }}</p>
            <p :class="['text-xs mb-2.5 font-medium', dark ? 'text-white/60' : 'text-gray-600']">{{ job.customer }}</p>
            <div class="space-y-1 mb-2.5">
              <p v-for="(s, i) in job.services" :key="i" :class="['text-xs', dark ? 'text-white/50' : 'text-gray-500']">{{ s }}</p>
            </div>
            <div :class="['flex items-center gap-1.5 pt-2.5 border-t', dark ? 'border-white/8' : 'border-gray-100']">
              <div class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center text-[10px] font-bold">{{ job.foreman.charAt(0) }}</div>
              <span :class="['text-xs', dark ? 'text-white/40' : 'text-gray-400']">{{ job.foreman }}</span>
            </div>
          </div>
          <div v-if="!readyJobs.length" :class="['text-xs text-center py-8', dark ? 'text-white/15' : 'text-gray-300']">No ready jobs</div>
        </div>
      </section>
    </main>

    <!-- Footer -->
    <footer :class="['px-8 py-2 border-t flex items-center justify-between transition-colors duration-300', dark ? 'bg-[#161920] border-white/8' : 'bg-white border-gray-200']">
      <p :class="['text-[10px]', dark ? 'text-white/20' : 'text-gray-300']">Harvest Grow Veg Sdn Bhd</p>
      <div class="flex items-center gap-1.5">
        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <p :class="['text-[10px]', dark ? 'text-white/20' : 'text-gray-300']">Live</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const dark = ref(true)

// ─── Live Clock ───────────────────────────────────
const currentTime = ref('')
const currentDate = ref('')
let clockTimer: ReturnType<typeof setInterval>

function updateClock() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
  currentDate.value = now.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Placeholder Data ─────────────────────────────
interface Job {
  id: string
  plate: string
  vehicle: string
  customer: string
  services: string[]
  foreman: string
  status: 'waiting' | 'progress' | 'ready'
  elapsed: number
}

// Plate/vehicle reused as Order# / Customer area; services used for line items.
const jobs = ref<Job[]>([
  {
    id: '1', plate: 'ORD-1001', vehicle: 'Restoran Sri Muda',
    customer: 'Chef Ahmad', services: ['5kg Sawi (cut)', '10 bundles Kangkong', '2kg Shiitake mushroom'],
    foreman: 'Packer Ali', status: 'progress', elapsed: 30,
  },
  {
    id: '2', plate: 'ORD-1002', vehicle: 'Hotel Austin Heights',
    customer: 'Chef Tan', services: ['20kg Pak Choy', '15kg Kailan Cut', '5kg Cucumber sliced'],
    foreman: 'Packer Siti', status: 'progress', elapsed: 15,
  },
  {
    id: '3', plate: 'ORD-1003', vehicle: 'Kopitiam Johor',
    customer: 'Mr. Lim', services: ['30 pcs Tauhu Goreng', '10 pcs Tau Kwa', '5kg Mee Putih'],
    foreman: 'Packer Ravi', status: 'waiting', elapsed: 5,
  },
  {
    id: '4', plate: 'ORD-1004', vehicle: 'Pasar Borong',
    customer: 'Mr. Chong', services: ['50kg Kangkong', '30kg Sawi', '20kg Kuey Teow'],
    foreman: 'Packer Ali', status: 'ready', elapsed: 60,
  },
  {
    id: '5', plate: 'ORD-1005', vehicle: 'Canteen SK Taman',
    customer: 'Pn Zainab', services: ['10kg Bitter Gourd', '5kg Oyster Mushroom'],
    foreman: 'Packer Siti', status: 'progress', elapsed: 20,
  },
  {
    id: '6', plate: 'ORD-1006', vehicle: 'Cafe Bistro',
    customer: 'Chef Wong', services: ['8kg Sawi (whole)', '6 bundles Kangkong', '3kg Enoki'],
    foreman: 'Packer Ravi', status: 'waiting', elapsed: 2,
  },
  {
    id: '7', plate: 'ORD-1007', vehicle: 'Kedai Runcit Lina',
    customer: 'Pn Lina', services: ['Mixed Veg Pack 500g x 20', '5kg Mee Hoon'],
    foreman: 'Packer Ali', status: 'ready', elapsed: 90,
  },
  {
    id: '8', plate: 'ORD-1008', vehicle: 'Restoran Vegetarian',
    customer: 'Mr. Ng', services: ['12kg Pak Choy', '8kg Kailan Cut', '4kg Foo Chuk'],
    foreman: 'Packer Siti', status: 'progress', elapsed: 45,
  },
])

const waitingJobs = computed(() => jobs.value.filter(j => j.status === 'waiting'))
const progressJobs = computed(() => jobs.value.filter(j => j.status === 'progress'))
const readyJobs = computed(() => jobs.value.filter(j => j.status === 'ready'))
const waitingCount = computed(() => waitingJobs.value.length)
const inProgressCount = computed(() => progressJobs.value.length)
const readyCount = computed(() => readyJobs.value.length)
const totalJobs = computed(() => jobs.value.length)

function formatElapsed(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

let tickTimer: ReturnType<typeof setInterval>

onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  tickTimer = setInterval(() => {
    jobs.value.forEach(j => { if (j.status !== 'ready') j.elapsed++ })
  }, 60000)
})

onUnmounted(() => {
  clearInterval(clockTimer)
  clearInterval(tickTimer)
})
</script>
