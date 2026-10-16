<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'

const managers = [
  { id: 'npm', command: 'npm create ifloom@latest my-game' },
  { id: 'bun', command: 'bun create ifloom my-game' },
  { id: 'pnpm', command: 'pnpm create ifloom my-game' },
  { id: 'yarn', command: 'yarn create ifloom my-game' },
] as const
type Manager = (typeof managers)[number]['id']

const KEY = 'ifloom.packageManager'
const chosen = ref<Manager>('npm')
const copied = ref(false)
const command = computed(() => managers.find((m) => m.id === chosen.value)!.command)

onMounted(() => {
  try {
    const saved = localStorage.getItem(KEY)
    if (managers.some((m) => m.id === saved)) chosen.value = saved as Manager
  } catch {
    // Storage can be blocked. The default is fine.
  }
})

function choose(id: Manager) {
  chosen.value = id
  copied.value = false
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // Not remembered this time.
  }
}

let reset: ReturnType<typeof setTimeout> | undefined
async function copy() {
  try {
    await navigator.clipboard.writeText(command.value)
    copied.value = true
    clearTimeout(reset)
    reset = setTimeout(() => (copied.value = false), 1800)
  } catch {
    copied.value = false
  }
}
</script>

<template>
  <div class="shell">
    <div class="core">
      <div class="top">
        <div class="tabs" role="tablist" aria-label="Package manager">
          <button
            v-for="m in managers"
            :key="m.id"
            type="button"
            role="tab"
            :aria-selected="chosen === m.id"
            :class="{ on: chosen === m.id }"
            @click="choose(m.id)"
          >
            {{ m.id }}
          </button>
        </div>
        <span class="soon">With the first release</span>
      </div>
      <div class="line">
        <code><span class="prompt" aria-hidden="true">$</span>{{ command }}</code>
        <button type="button" class="copy" :aria-label="copied ? 'Copied' : 'Copy the command'" @click="copy">
          <span>{{ copied ? 'Copied' : 'Copy' }}</span>
          <span class="knob" aria-hidden="true">
            <svg v-if="!copied" viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="2.5" /><path d="M5 15V7a2 2 0 0 1 2-2h8" /></svg>
            <svg v-else viewBox="0 0 24 24"><path d="m6 12.5 4 4 8-9" /></svg>
          </span>
        </button>
      </div>
      <p class="note">
        This command arrives with the first release, when the packages go on npm. Until then you start from a checkout:
        <code>git clone</code> the repository, run <code>npm install</code>, then <code>npm run new -- my-game</code>.
        <a :href="withBase('/guide/installation')">Installation</a> walks you through it.
      </p>
    </div>
  </div>
</template>

<style scoped>
.shell {
  padding: 6px;
  border: 1px solid var(--hair);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.025);
}

.core {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 22px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.tabs {
  display: inline-flex;
  padding: 4px;
  border: 1px solid var(--hair-2);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.3);
}

.tabs button {
  padding: 7px 16px;
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink-3);
  transition: color 0.5s var(--ease), background-color 0.5s var(--ease);
}

.tabs button:hover {
  color: var(--ink);
}

.tabs button.on {
  background: rgba(255, 150, 60, 0.16);
  color: var(--ember-2);
}

.soon {
  padding: 5px 11px;
  border: 1px solid rgba(255, 166, 87, 0.22);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ember-2);
}

.line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 8px 8px 20px;
  border: 1px solid var(--hair-2);
  border-radius: 18px;
  background: rgba(0, 0, 0, 0.35);
}

.line code {
  min-width: 0;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 15px;
  color: var(--ink);
  white-space: nowrap;
  scrollbar-width: none;
}

.prompt {
  margin-right: 12px;
  color: var(--ember);
}

.copy {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 10px;
  padding: 5px 5px 5px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  font-size: 13px;
  color: var(--ink);
  transition: transform 0.6s var(--ease), background-color 0.6s var(--ease);
}

.copy:hover {
  background: rgba(255, 255, 255, 0.11);
}

.copy:active {
  transform: scale(0.98);
}

.knob {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  transition: transform 0.6s var(--ease);
}

.copy:hover .knob {
  transform: translate(2px, -1px) scale(1.05);
}

.knob svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.note {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--ink-3);
}

.note code {
  white-space: nowrap;
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  font-family: var(--mono);
  font-size: 12.5px;
  color: var(--ink-2);
}

.note a {
  color: var(--ember-2);
  text-decoration: underline;
  text-decoration-color: rgba(255, 184, 102, 0.4);
  text-underline-offset: 3px;
}

@media (max-width: 767px) {
  .core {
    padding: 16px;
  }

  .tabs button {
    padding: 7px 12px;
  }

  .line {
    padding-left: 14px;
  }

  .line code {
    font-size: 13px;
    white-space: normal;
    overflow-wrap: anywhere;
  }

  .copy > span:first-child {
    display: none;
  }

  .copy {
    padding: 5px;
  }
}
</style>
