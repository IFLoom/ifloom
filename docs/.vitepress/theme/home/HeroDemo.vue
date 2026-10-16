<script setup lang="ts">
// The pack on the left types itself in once, and the panel on the right shows
// what the engine's view says to draw at each point. A choice shows its bare
// id until its prose key lands, as the engine does.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { LINES, STARTS, TOKENS, TOTAL, cut, lineOf } from './code'
import { tilt } from './tilt'

const typed = ref(TOTAL)
const typing = ref(false)
const root = ref<HTMLElement>()
let timer: ReturnType<typeof setTimeout> | undefined
let observer: IntersectionObserver | undefined

const shown = (i: number) => Math.max(0, Math.min(LINES[i].length, typed.value - STARTS[i]))
const through = (i: number) => typed.value >= STARTS[i] + LINES[i].length

const lines = computed(() => TOKENS.map((tokens, i) => cut(tokens, shown(i))))
const caretLine = computed(() => STARTS.findLastIndex((start) => start <= typed.value))

const at = {
  coins: lineOf('spendable'),
  title: lineOf('title:'),
  tea: lineOf("id: 'tea'"),
  teaPrice: lineOf('by: -2'),
  cake: lineOf("id: 'cake'"),
  cakePrice: lineOf('by: -5'),
  blocked: lineOf('reason:'),
  body: lineOf("counter: '"),
  teaLabel: lineOf("'counter#tea'"),
  cakeLabel: lineOf("'counter#cake'"),
}

const view = computed(() => ({
  coins: through(at.coins),
  title: through(at.title),
  body: through(at.body),
  tea: through(at.tea) && {
    label: through(at.teaLabel) ? 'A pot of tea' : 'tea',
    price: through(at.teaPrice),
  },
  cake: through(at.cake) && {
    label: through(at.cakeLabel) ? 'A slice of lemon cake' : 'cake',
    price: through(at.cakePrice),
    disabled: through(at.blocked),
  },
}))

function step() {
  if (typed.value >= TOTAL) {
    typing.value = false
    return
  }
  // Indentation arrives at once, as an editor would put it there.
  let next = typed.value + 1
  const line = caretLine.value
  if (typed.value === STARTS[line]) {
    while (LINES[line][next - STARTS[line] - 1] === ' ') next++
  }
  typed.value = next
  const atEnd = next >= STARTS[line] + LINES[line].length
  timer = setTimeout(step, atEnd ? 90 : 11)
}

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !root.value) return
  typed.value = 0
  typing.value = true
  observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return
    observer?.disconnect()
    timer = setTimeout(step, 700)
  }, { threshold: 0.2 })
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  observer?.disconnect()
})

const vTilt = tilt
</script>

<template>
  <div ref="root" class="demo">
    <figure class="shell code-shell" v-tilt>
      <div class="core code">
        <figcaption class="bar">
          <span class="dots" aria-hidden="true"><i /><i /><i /></span>
          <span class="file">cafe.ts</span>
        </figcaption>
        <pre aria-label="A pack written in TypeScript"><code><span v-for="(tokens, i) in lines" :key="i" class="line"><span class="no" aria-hidden="true">{{ i + 1 }}</span><span v-for="(token, j) in tokens" :key="j" :class="token.c">{{ token.t }}</span><span v-if="typing && i === caretLine" class="caret" aria-hidden="true" />
</span></code></pre>
      </div>
    </figure>

    <figure class="shell out-shell" v-tilt>
      <div class="core out" aria-live="off">
        <figcaption class="bar">
          <span class="file">What the engine's view says to draw</span>
        </figcaption>
        <div class="screen">
          <div class="head">
              <h3 v-if="view.title" key="t" class="title pop">The Corner Café</h3>
              <span v-else key="s" class="skeleton wide" />
              <span v-if="view.coins" class="stat pop">Coins <b>£3</b></span>
          </div>
            <p v-if="view.body" key="b" class="prose pop">A lemon cake sits under a glass dome.</p>
            <span v-else key="s" class="skeleton" />
          <div class="choices">
              <div v-if="view.tea" class="choice pop">
                <span class="label">{{ view.tea.label }}</span>
                <span v-if="view.tea.price" class="price">£2</span>
              </div>
              <div v-if="view.cake" class="choice pop" :class="{ disabled: view.cake.disabled }" :aria-disabled="view.cake.disabled">
                <span class="label">{{ view.cake.label }}</span>
                <span v-if="view.cake.price" class="price">£5</span>
                  <span v-if="view.cake.disabled" class="reason pop">You only have £3 on you.</span>
              </div>
          </div>
        </div>
      </div>
    </figure>
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
  gap: 28px;
  align-items: start;
}

.out-shell {
  margin-top: 72px;
}

.shell {
  margin: 0;
  padding: 6px;
  border: 1px solid var(--hair);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.025);
  transition: transform 0.9s var(--ease);
}

.core {
  overflow: hidden;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.012));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.code {
  background: linear-gradient(180deg, rgba(20, 15, 11, 0.92), rgba(10, 8, 6, 0.92));
}

.bar {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--hair-2);
  font-size: 12px;
  color: var(--ink-3);
}

.dots {
  display: flex;
  gap: 6px;
}

.dots i {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
}

.file {
  font-family: var(--mono);
}

pre {
  margin: 0;
  padding: 18px 20px 22px 0;
  overflow-x: auto;
  font-family: var(--mono);
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-2);
  scrollbar-width: thin;
}

.line {
  display: block;
  min-height: 1.7em;
  white-space: pre;
}

.no {
  display: inline-block;
  width: 44px;
  padding-right: 16px;
  text-align: right;
  color: rgba(255, 255, 255, 0.16);
  user-select: none;
}

.str { color: #ffc78a; }
.kw { color: #ff8f5a; }
.ty { color: #f2d3a8; }
.num { color: #ffb366; }
.bool { color: #ffb366; }
.key { color: #ece4da; }
.pun { color: rgba(255, 255, 255, 0.35); }

.caret {
  display: inline-block;
  width: 7px;
  height: 1.15em;
  margin-left: 1px;
  vertical-align: -0.2em;
  background: var(--ember);
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.out {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.015));
}

.screen {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-height: 330px;
  padding: 26px 24px 28px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 30px;
}

.title {
  margin: 0;
  font-family: var(--display);
  font-size: 19px;
  font-weight: 400;
  color: var(--ink);
}

.stat {
  padding: 5px 11px;
  border: 1px solid var(--hair);
  border-radius: 999px;
  font-size: 12px;
  color: var(--ink-3);
  white-space: nowrap;
}

.stat b {
  margin-left: 4px;
  font-weight: 500;
  color: var(--ember-2);
}

.prose {
  margin: 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-2);
}

.skeleton {
  display: block;
  width: 72%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.skeleton.wide {
  width: 48%;
  height: 16px;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.choice {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 16px;
  border: 1px solid rgba(255, 166, 87, 0.28);
  border-radius: 14px;
  background: rgba(255, 140, 50, 0.1);
  transition: background-color 0.7s var(--ease), border-color 0.7s var(--ease), opacity 0.7s var(--ease);
}

.label {
  font-size: 14.5px;
  font-weight: 500;
  color: var(--ink);
}

.price {
  font-size: 12px;
  color: var(--ember-2);
}

.choice.disabled {
  border-color: var(--hair);
  background: transparent;
}

.choice.disabled .label,
.choice.disabled .price {
  opacity: 0.45;
}

.reason {
  font-size: 12px;
  color: var(--ink-2);
}

.pop {
  animation: pop 0.6s var(--ease);
}

@keyframes pop {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pop {
    animation: none;
  }
}

@media (max-width: 1023px) {
  .demo {
    grid-template-columns: minmax(0, 1fr);
  }

  .out-shell {
    margin-top: 0;
  }
}

@media (max-width: 767px) {
  pre {
    font-size: 11.5px;
  }

  .no {
    width: 34px;
    padding-right: 12px;
  }

  .screen {
    min-height: 0;
  }
}
</style>
