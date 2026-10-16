<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { withBase } from 'vitepress'

const links = [
  { text: 'Guide', href: withBase('/guide/introduction') },
  { text: 'Reference', href: withBase('/reference/game') },
  { text: 'Changelog', href: withBase('/changelog') },
  { text: 'GitHub', href: 'https://github.com/IFLoom/ifloom', external: true },
]

const open = ref(false)

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  document.documentElement.classList.toggle('ifl-menu-open', isOpen)
  if (isOpen) window.addEventListener('keydown', onKey)
  else window.removeEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.classList.remove('ifl-menu-open')
})
</script>

<template>
  <nav class="pill" aria-label="Main">
    <a class="mark" :href="withBase('/')">IFLoom</a>
    <ul class="links">
      <li v-for="link in links" :key="link.text">
        <a :href="link.href" :target="link.external ? '_blank' : undefined" :rel="link.external ? 'noreferrer' : undefined">{{ link.text }}</a>
      </li>
    </ul>
    <span class="version" title="The docs on this site are for the latest, unreleased code">Latest (pre-release)</span>
    <a class="docs" :href="withBase('/guide/introduction')">
      Docs
      <span class="knob" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8" /></svg>
      </span>
    </a>
    <button class="burger" :class="{ open }" type="button" :aria-expanded="open" aria-controls="ifl-menu" :aria-label="open ? 'Close the menu' : 'Open the menu'" @click="open = !open">
      <span /><span />
    </button>
  </nav>

  <div id="ifl-menu" class="menu" :class="{ open }" :aria-hidden="!open" :inert="!open || undefined">
    <ul>
      <li v-for="(link, i) in [{ text: 'Docs', href: withBase('/guide/introduction') }, ...links]" :key="link.text" :style="{ '--i': i }">
        <a :href="link.href" :target="'external' in link && link.external ? '_blank' : undefined" @click="open = false">{{ link.text }}</a>
      </li>
    </ul>
    <p :style="{ '--i': links.length + 1 }">Latest (pre-release)</p>
  </div>
</template>

<style scoped>
.pill {
  position: fixed;
  top: 16px;
  left: 50%;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: calc(100% - 32px);
  padding: 6px 6px 6px 20px;
  border: 1px solid var(--hair);
  border-radius: 999px;
  background: rgba(14, 11, 9, 0.55);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 20px 50px -30px rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  transform: translateX(-50%);
}

.mark {
  margin-right: 12px;
  font-family: var(--display);
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--ink);
}

.links {
  display: flex;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.links a {
  display: block;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 14px;
  color: var(--ink-2);
  transition: color 0.5s var(--ease), background-color 0.5s var(--ease);
}

.links a:hover {
  color: var(--ink);
  background: rgba(255, 255, 255, 0.06);
}

.version {
  margin: 0 6px 0 4px;
  padding: 5px 10px;
  border: 1px solid rgba(255, 166, 87, 0.22);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ember-2);
  white-space: nowrap;
}

.docs {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 5px 5px 5px 16px;
  border-radius: 999px;
  background: var(--ember-grad);
  font-size: 14px;
  font-weight: 500;
  color: #1c0f05;
  transition: transform 0.6s var(--ease);
}

.docs:active {
  transform: scale(0.98);
}

.knob {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: rgba(28, 15, 5, 0.14);
  transition: transform 0.6s var(--ease);
}

.docs:hover .knob {
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

.burger {
  position: relative;
  display: none;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
}

.burger span {
  position: absolute;
  left: 13px;
  width: 14px;
  height: 1.5px;
  border-radius: 2px;
  background: var(--ink);
  transition: transform 0.6s var(--ease);
}

.burger span:first-child {
  transform: translateY(-3.5px);
}

.burger span:last-child {
  transform: translateY(3.5px);
}

.burger.open span:first-child {
  transform: rotate(45deg);
}

.burger.open span:last-child {
  transform: rotate(-45deg);
}

.menu {
  position: fixed;
  inset: 0;
  z-index: 25;
  display: none;
  flex-direction: column;
  justify-content: center;
  padding: 96px 24px 48px;
  background: rgba(5, 5, 5, 0.8);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.6s var(--ease);
}

.menu.open {
  opacity: 1;
  pointer-events: auto;
}

.menu ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.menu li,
.menu p {
  opacity: 0;
  transform: translateY(48px);
  transition: opacity 0.7s var(--ease), transform 0.7s var(--ease);
  transition-delay: 0s;
}

.menu.open li,
.menu.open p {
  opacity: 1;
  transform: none;
  transition-delay: calc(100ms + var(--i) * 60ms);
}

.menu a {
  display: block;
  padding: 10px 0;
  font-family: var(--display);
  font-size: 32px;
  font-weight: 400;
  color: var(--ink);
}

.menu p {
  margin-top: 32px;
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ember-2);
}

@media (max-width: 900px) {
  .version {
    display: none;
  }
}

@media (max-width: 767px) {
  .pill {
    width: calc(100% - 32px);
    justify-content: space-between;
    padding-left: 20px;
  }

  .links,
  .docs {
    display: none;
  }

  .burger {
    display: block;
  }

  .menu {
    display: flex;
  }
}
</style>
