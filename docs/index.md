---
layout: home

hero:
  name: IFLoom
  text: An interactive fiction engine for any shape of game
  tagline: Write a linear novel, a management game or a life sim in TypeScript, on one small core with plugins for the rest.
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: Your first story
      link: /guide/first-story
    - theme: alt
      text: Reference
      link: /reference/game
    - theme: alt
      text: llms.txt for AI agents
      link: https://ifloom.github.io/ifloom/llms.txt

features:
  - title: Any shape of game
    details: A novel in chapters, a café run a week at a time, or a town where people keep their own hours. All three run on the same engine.
    link: /guide/shapes
    linkText: Shapes of game
  - title: A small core, plugins for the rest
    details: The core keeps the turn, scenes, stats, entities, variables and saves. A calendar, places, characters, quests and a phone are plugins you add when your game needs them.
    link: /plugins/
    linkText: Plugins
  - title: Any framework, or none
    details: The engine has no DOM and no framework. It hands you a view to draw. The React UI draws it for you, or you can draw it with Vue, Svelte or plain DOM.
    link: /guide/frameworks
    linkText: Using another framework
  - title: Content is data
    details: Conditions and effects are plain objects, not code. The loader checks them before anyone plays, and a mod can add to them without shipping a script.
  - title: One HTML file to ship
    details: A built game is one index.html, with its pictures beside it or inside it. It opens from disk with a double-click and uploads to itch.io as it is.
    link: /guide/shipping
    linkText: Shipping a game
  - title: Docs an AI agent can read
    details: The docs come as llms.txt and llms-full.txt, and every new game has an AGENTS.md that tells a coding agent where to look and how to check its work.
    link: /guide/agents
    linkText: Using IFLoom with an AI agent
---

::: warning Pre-release
Nothing is a stable API yet, and the packages aren't on npm. You build games from a checkout of the repository for now. See [API status](/guide/status).
:::
