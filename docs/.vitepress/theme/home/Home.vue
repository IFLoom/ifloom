<script setup lang="ts">
// The homepage at /ifloom/. It's always dark, whatever the docs' theme toggle
// says: every colour is set here rather than taken from VitePress.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import HomeNav from './HomeNav.vue'
import HeroDemo from './HeroDemo.vue'
import InstallCard from './InstallCard.vue'
import { tilt as vTilt } from './tilt'

const page = ref<HTMLElement>()
let observer: IntersectionObserver | undefined

// Sections fade up as they come into view. A script in the page's head adds
// .ifl-reveal before the first paint, unless the reader asks for less motion,
// so without JavaScript the sections are simply there.
onMounted(() => {
  const els = page.value?.querySelectorAll<HTMLElement>('.reveal') ?? []
  if (!document.documentElement.classList.contains('ifl-reveal')) return
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('in'))
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('in')
        observer?.unobserve(entry.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )
  els.forEach((el) => observer!.observe(el))
})

onBeforeUnmount(() => observer?.disconnect())

const shapes = [
  { name: 'The Letter', shape: 'A linear novel', detail: 'Three chapters, no plugins' },
  { name: 'The Corner Café', shape: 'A management game', detail: 'A turn is a week, staff are entities' },
  { name: 'Small Town', shape: 'A life sim', detail: 'Calendar, places, cast and a phone' },
]

const plugins = ['calendar', 'places', 'cast', 'quests', 'wardrobe', 'messages', 'feed', 'devices', 'phone', 'debug']
const inThisGame = new Set(['calendar', 'places', 'cast'])

const presets = [
  { name: 'paper', bg: 'oklch(0.97 0.012 85)', fg: 'oklch(0.24 0.02 60)', accent: 'oklch(0.42 0.09 30)', radius: '0', font: 'Georgia, serif' },
  { name: 'terminal', bg: 'oklch(0.16 0.01 150)', fg: 'oklch(0.86 0.13 150)', accent: 'oklch(0.86 0.13 150)', radius: '0', font: 'var(--mono)' },
  { name: 'studio', bg: 'oklch(0.965 0.005 260)', fg: 'oklch(0.22 0.02 265)', accent: 'oklch(0.55 0.2 275)', radius: '9px', font: 'var(--body)' },
  { name: 'storybook', bg: 'oklch(0.95 0.035 75)', fg: 'oklch(0.3 0.05 45)', accent: 'oklch(0.62 0.16 35)', radius: '14px', font: 'ui-rounded, var(--body)' },
]

const guarantees = ['Content is typed', 'Randomness is seeded from the save', 'Saves replay exactly', 'Old saves load into new versions']
</script>

<template>
  <div ref="page" class="ifl-home">
    <div class="glow" aria-hidden="true">
      <span class="orb a" /><span class="orb b" /><span class="orb c" />
    </div>
    <div class="grain" aria-hidden="true" />

    <HomeNav />

    <main>
      <section class="hero wrap">
        <div class="intro reveal">
          <span class="eyebrow">Pre-release · TypeScript</span>
          <h1>Interactive fiction for <em>any shape</em> of game</h1>
          <p class="lede">
            Write a linear novel, a management game or a life sim. Scenes, choices and stats are data, and the engine works out what the player can do right now, and why not.
          </p>
          <div class="ctas">
            <a class="cta" :href="withBase('/guide/introduction')">
              Read the docs
              <span class="knob" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg></span>
            </a>
            <a class="ghost" :href="withBase('/guide/first-story')">Your first story</a>
          </div>
        </div>

        <div class="reveal late">
          <HeroDemo />
          <p class="caption">
            The cake's rule is written once, in the data. The engine greys the choice out and writes the reason on it, and it refuses the same choice if anything sends it anyway.
          </p>
        </div>
      </section>

      <section class="install wrap reveal" aria-labelledby="install-title">
        <h2 id="install-title" class="small-title">Start a game</h2>
        <InstallCard />
      </section>

      <section class="features wrap" aria-labelledby="features-title">
        <div class="section-head reveal">
          <span class="eyebrow">What you get</span>
          <h2 id="features-title">A small core, and the rest when you need it</h2>
        </div>

        <div class="bento">
          <article class="card shape reveal">
            <div class="shell" v-tilt>
              <div class="core">
                <span class="tag">01</span>
                <h3>Any shape of game</h3>
                <p>
                  A linear novel, a management game played a week at a time, or a life sim with a calendar, places and characters. All three run on one small core that keeps the turn, scenes, stats, entities and saves.
                </p>
                <ul class="shapes">
                  <li v-for="s in shapes" :key="s.name">
                    <span class="shape-name">{{ s.name }}</span>
                    <span class="shape-kind">{{ s.shape }}</span>
                    <span class="shape-detail">{{ s.detail }}</span>
                  </li>
                </ul>
                <p class="foot">Each one is an example game in the repository, and a template for <code>ifloom new</code>.</p>
              </div>
            </div>
          </article>

          <article class="card plugins reveal">
            <div class="shell" v-tilt>
              <div class="core">
                <span class="tag">02</span>
                <h3>Plugins</h3>
                <p>Each plugin is a package of its own. Plugins work together when a game has both, but never require each other, so a game takes only what it needs.</p>
                <ul class="chips">
                  <li v-for="p in plugins" :key="p" :class="{ on: inThisGame.has(p) }">{{ p }}</li>
                </ul>
                <p class="foot">Lit up: what a life sim might take.</p>
              </div>
            </div>
          </article>

          <article class="card look reveal">
            <div class="shell" v-tilt>
              <div class="core">
                <span class="tag">03</span>
                <h3>Your look, your framework</h3>
                <p>The React UI comes with four theme presets. You can change the classes on any part or replace any component. Or skip React and draw the view with Vue, Svelte or plain DOM.</p>
                <ul class="presets">
                  <li v-for="p in presets" :key="p.name">
                    <span class="swatch" :style="{ background: p.bg, color: p.fg, borderRadius: p.radius, fontFamily: p.font }">
                      Aa
                      <i :style="{ background: p.accent, borderRadius: p.radius }" />
                    </span>
                    <span class="preset-name">{{ p.name }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <article class="card checked reveal">
            <div class="shell" v-tilt>
              <div class="core">
                <span class="tag">04</span>
                <h3>Checked before anyone plays</h3>
                <p>Conditions and effects are plain objects, so the engine can read every one of them. <code>ifloom check</code> reports what a scene names that isn't there, including missing pictures and sounds.</p>
                <div class="term">
                  <span><b>$</b> npm run check</span>
                  <span class="ok">No problems.</span>
                </div>
                <ul class="ticks">
                  <li v-for="g in guarantees" :key="g">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12.5 4 4 8-9" /></svg>{{ g }}
                  </li>
                </ul>
              </div>
            </div>
          </article>

          <article class="card ship reveal">
            <div class="shell" v-tilt>
              <div class="core">
                <span class="tag">05</span>
                <h3>Ship one file, with sound and video</h3>
                <p>
                  <code>ifloom build</code> makes one <code>index.html</code> that opens from disk. Music, ambience and voice lines play on their own channels. Video sits inline in the prose, and pictures can carry hotspots. The docs come as <code>llms.txt</code> for your coding agent.
                </p>
                <div class="files">
                  <span class="file"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4V20.5H7z" /><path d="M14 3.5v4h4" /></svg>dist/index.html</span>
                  <span class="mark">[[video:]]</span>
                  <span class="mark">[[sound:]]</span>
                  <span class="mark">hotspots</span>
                  <a class="mark link" href="https://ifloom.github.io/ifloom/llms.txt">llms.txt</a>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="closing wrap reveal" aria-labelledby="closing-title">
        <div class="shell">
          <div class="core">
            <h2 id="closing-title">Start with the guide</h2>
            <p>It takes you from a checkout of the repository to a short novel of your own, then on to a game with a calendar, places and characters.</p>
            <div class="ctas center">
              <a class="cta" :href="withBase('/guide/introduction')">
                Read the docs
                <span class="knob" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg></span>
              </a>
              <a class="ghost" :href="withBase('/guide/installation')">Installation</a>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="wrap">
      <span>IFLoom is pre-release and MIT licensed.</span>
      <nav aria-label="Footer">
        <a :href="withBase('/guide/introduction')">Docs</a>
        <a :href="withBase('/changelog')">Changelog</a>
        <a href="https://github.com/IFLoom/ifloom" rel="noreferrer">GitHub</a>
      </nav>
    </footer>
  </div>
</template>

<style>
/* The page behind the homepage, for overscroll and the menu's scroll lock. */
html:has(.ifl-home),
body:has(.ifl-home) {
  background: #050505;
  color-scheme: dark;
}

html.ifl-menu-open {
  overflow: hidden;
}

/* Only hidden once the script has started watching for them. */
html.ifl-reveal .ifl-home .reveal:not(.in) {
  opacity: 0;
  transform: translateY(56px);
}
</style>

<style scoped>
.ifl-home {
  --bg: #050505;
  --ink: #f5efe7;
  --ink-2: rgba(245, 239, 231, 0.7);
  --ink-3: rgba(245, 239, 231, 0.48);
  --hair: rgba(255, 255, 255, 0.1);
  --hair-2: rgba(255, 255, 255, 0.06);
  --ember: #ff8a3d;
  --ember-2: #ffb46b;
  --ember-grad: linear-gradient(135deg, #ffc27a 0%, #ff8a3d 55%, #f0642a 100%);
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
  --display: 'Unbounded Variable', ui-sans-serif, sans-serif;
  --body: 'Geist Variable', ui-sans-serif, sans-serif;
  --mono: 'Geist Mono Variable', ui-monospace, monospace;

  position: relative;
  min-height: 100dvh;
  overflow-x: clip;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--body);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.ifl-home :deep(a) {
  text-decoration: none;
}

.ifl-home :deep(button) {
  font: inherit;
  cursor: pointer;
}

/* Ember light: three soft orbs drifting slowly behind everything. */
.glow {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}

.orb.a {
  top: -22vh;
  left: -12vw;
  width: 70vw;
  height: 70vw;
  max-width: 980px;
  max-height: 980px;
  background: radial-gradient(closest-side, rgba(255, 128, 48, 0.22), rgba(255, 128, 48, 0.07) 55%, transparent);
  animation: drift-a 38s var(--ease) infinite alternate;
}

.orb.b {
  right: -18vw;
  top: 28vh;
  width: 60vw;
  height: 60vw;
  max-width: 860px;
  max-height: 860px;
  background: radial-gradient(closest-side, rgba(224, 82, 30, 0.16), rgba(224, 82, 30, 0.05) 55%, transparent);
  animation: drift-b 46s var(--ease) infinite alternate;
}

.orb.c {
  bottom: -30vh;
  left: 20vw;
  width: 55vw;
  height: 55vw;
  max-width: 760px;
  max-height: 760px;
  background: radial-gradient(closest-side, rgba(255, 190, 110, 0.1), transparent 70%);
  animation: drift-c 54s var(--ease) infinite alternate;
}

@keyframes drift-a {
  to { transform: translate(8vw, 6vh) scale(1.08); }
}

@keyframes drift-b {
  to { transform: translate(-10vw, -8vh) scale(0.94); }
}

@keyframes drift-c {
  to { transform: translate(-6vw, -10vh) scale(1.1); }
}

.grain {
  position: fixed;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

main,
footer {
  position: relative;
  z-index: 2;
}

.wrap {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding-inline: 32px;
}

.reveal {
  transition: opacity 1s var(--ease), transform 1.1s var(--ease);
}

.reveal.late {
  transition-delay: 0.15s;
}

/* Type */
.eyebrow {
  display: inline-block;
  padding: 5px 12px;
  border: 1px solid rgba(255, 166, 87, 0.24);
  border-radius: 999px;
  background: rgba(255, 138, 61, 0.06);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ember-2);
}

h1,
h2,
h3 {
  margin: 0;
  font-family: var(--display);
  font-weight: 400;
  color: var(--ink);
  border: 0;
  padding: 0;
}

h1 {
  margin-top: 26px;
  max-width: 16ch;
  font-size: clamp(2.1rem, 5.6vw, 4.4rem);
  line-height: 1.04;
  letter-spacing: -0.035em;
}

h1 em {
  font-style: normal;
  background: var(--ember-grad);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

h2 {
  font-size: clamp(1.6rem, 3.6vw, 2.8rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
}

h3 {
  font-size: 1.2rem;
  line-height: 1.3;
  letter-spacing: -0.015em;
}

p {
  margin: 0;
}

code {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.07);
  font-family: var(--mono);
  font-size: 0.86em;
  color: var(--ink);
}

/* Buttons: a pill with its arrow in a pill of its own. */
.ctas {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  margin-top: 36px;
}

.ctas.center {
  justify-content: center;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  padding: 7px 7px 7px 24px;
  border-radius: 999px;
  background: var(--ember-grad);
  box-shadow: 0 18px 50px -18px rgba(255, 120, 40, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.35);
  font-size: 15px;
  font-weight: 500;
  color: #1c0f05;
  transition: transform 0.6s var(--ease);
}

.cta:active {
  transform: scale(0.98);
}

.cta .knob {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(28, 15, 5, 0.14);
  transition: transform 0.6s var(--ease);
}

.cta:hover .knob {
  transform: translate(3px, -1px) scale(1.05);
}

.cta svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ghost {
  padding: 13px 22px;
  border: 1px solid var(--hair);
  border-radius: 999px;
  font-size: 15px;
  color: var(--ink-2);
  transition: color 0.5s var(--ease), background-color 0.5s var(--ease);
}

.ghost:hover {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.05);
}

/* Hero */
.hero {
  display: flex;
  flex-direction: column;
  gap: 64px;
  padding-top: 144px;
  padding-bottom: 72px;
}

.lede {
  max-width: 40rem;
  margin-top: 26px;
  font-size: 1.15rem;
  line-height: 1.65;
  color: var(--ink-2);
}

.caption {
  max-width: 44rem;
  margin: 22px auto 0;
  font-size: 14px;
  line-height: 1.6;
  text-align: center;
  color: var(--ink-3);
}

/* Install */
.install {
  max-width: 880px;
  padding-top: 40px;
  padding-bottom: 96px;
}

.small-title {
  margin-bottom: 18px;
  font-family: var(--body);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: var(--ink-3);
}

/* Bento */
.features {
  padding-top: 96px;
  padding-bottom: 128px;
}

.section-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  max-width: 44rem;
  margin-bottom: 56px;
}

.bento {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 20px;
}

.card .shell {
  height: 100%;
  padding: 6px;
  border: 1px solid var(--hair);
  border-radius: 30px;
  background: rgba(255, 255, 255, 0.025);
  transition: transform 0.9s var(--ease);
}

.card .core {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 30px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.012));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.card p {
  color: var(--ink-2);
  font-size: 15px;
  line-height: 1.65;
}

.card p.foot {
  margin-top: auto;
  padding-top: 8px;
  font-size: 13px;
  color: var(--ink-3);
}

.tag {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ember);
}

.shape {
  grid-column: span 7;
  grid-row: span 2;
}

.plugins {
  grid-column: span 5;
}

.look {
  grid-column: span 5;
}

.checked {
  grid-column: span 5;
}

.ship {
  grid-column: span 7;
}

.shape h3 {
  font-size: clamp(1.5rem, 2.6vw, 2.1rem);
}

.shapes {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.shapes li {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 16px;
  padding: 26px 0;
  border-top: 1px solid var(--hair-2);
}

.shape-name {
  font-family: var(--display);
  font-size: 17px;
  color: var(--ink);
}

.shape-kind {
  grid-row: span 2;
  align-self: center;
  padding: 5px 12px;
  border: 1px solid rgba(255, 166, 87, 0.22);
  border-radius: 999px;
  font-size: 12px;
  color: var(--ember-2);
  white-space: nowrap;
}

.shape-detail {
  font-size: 14px;
  color: var(--ink-3);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.chips li {
  padding: 6px 12px;
  border: 1px solid var(--hair);
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-3);
}

.chips li.on {
  border-color: rgba(255, 166, 87, 0.4);
  background: rgba(255, 138, 61, 0.1);
  color: var(--ember-2);
}

.presets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
}

.presets li {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.swatch {
  position: relative;
  display: flex;
  align-items: flex-start;
  height: 64px;
  padding: 8px 10px;
  font-size: 18px;
  line-height: 1;
}

.swatch i {
  position: absolute;
  right: 8px;
  bottom: 8px;
  left: 10px;
  height: 10px;
}

.preset-name {
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--ink-3);
}

.term {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--hair-2);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.4);
  font-family: var(--mono);
  font-size: 13px;
  color: var(--ink-2);
}

.term b {
  font-weight: 400;
  color: var(--ember);
}

.term .ok {
  color: #ffd29e;
}

.ticks {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
  color: var(--ink-2);
}

.ticks li {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.ticks svg,
.file svg {
  flex: none;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  fill: none;
  stroke: var(--ember-2);
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.files {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.file,
.mark {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid var(--hair);
  border-radius: 999px;
  font-family: var(--mono);
  font-size: 12px;
  color: var(--ink-2);
}

.file {
  border-color: rgba(255, 166, 87, 0.4);
  background: rgba(255, 138, 61, 0.1);
  color: var(--ember-2);
}

.file svg {
  margin-top: 0;
}

.mark.link {
  transition: color 0.5s var(--ease), border-color 0.5s var(--ease);
}

.mark.link:hover {
  border-color: rgba(255, 166, 87, 0.4);
  color: var(--ink);
}

/* Closing */
.closing {
  padding-bottom: 128px;
}

.closing .shell {
  padding: 6px;
  border: 1px solid var(--hair);
  border-radius: 36px;
  background: rgba(255, 255, 255, 0.025);
}

.closing .core {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  padding: 88px 32px;
  border-radius: 30px;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 128, 48, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  text-align: center;
}

.closing p {
  max-width: 34rem;
  color: var(--ink-2);
}

.closing .ctas {
  margin-top: 16px;
}

footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 16px;
  padding-top: 32px;
  padding-bottom: 48px;
  border-top: 1px solid var(--hair-2);
  font-size: 13px;
  color: var(--ink-3);
}

footer nav {
  display: flex;
  gap: 20px;
}

footer a {
  color: var(--ink-2);
  transition: color 0.5s var(--ease);
}

footer a:hover {
  color: var(--ink);
}

@media (max-width: 1023px) {
  .shape,
  .plugins,
  .look,
  .checked,
  .ship {
    grid-column: span 6;
    grid-row: auto;
  }

  .shape {
    grid-column: span 12;
  }
}

@media (max-width: 767px) {
  .wrap {
    padding-inline: 16px;
  }

  .hero {
    gap: 48px;
    padding-top: 120px;
    padding-bottom: 48px;
  }

  .lede {
    font-size: 1.05rem;
  }

  .install {
    padding-bottom: 64px;
  }

  .features {
    padding-top: 64px;
    padding-bottom: 96px;
  }

  .bento {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .shape,
  .plugins,
  .look,
  .checked,
  .ship {
    grid-column: auto;
  }

  .card .core {
    padding: 22px;
  }

  .presets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ticks {
    grid-template-columns: 1fr;
  }

  .closing {
    padding-bottom: 96px;
  }

  .closing .core {
    padding: 56px 20px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .orb {
    animation: none;
  }

  .reveal {
    transition: none;
  }
}
</style>
