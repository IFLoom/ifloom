import { defineComponent, h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import { useData, type Theme } from 'vitepress'
import '@fontsource-variable/unbounded'
import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import Home from './home/Home.vue'
import VersionSwitcher from './VersionSwitcher.vue'

// The homepage (layout: landing) is a page of its own, with no VitePress nav or
// sidebar. Every other page uses the default theme.
const Layout = defineComponent({
  name: 'IFLoomLayout',
  setup() {
    const { frontmatter } = useData()
    return () => (frontmatter.value.layout === 'landing' ? h(Home) : h(DefaultTheme.Layout))
  },
})

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('VersionSwitcher', VersionSwitcher)
  },
} satisfies Theme
