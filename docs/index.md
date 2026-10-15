---
layout: home

hero:
  name: IFLoom
  text: An interactive fiction engine
  tagline: Interactive fiction where storylines are woven through a living world
  actions:
    - theme: brand
      text: Get started
      link: /guide/introduction
    - theme: alt
      text: Reference
      link: /reference/game

features:
  - title: A living world
    details: Time passes in turns, and with the calendar plugin in days and periods. With the places plugin, places open and close; with the cast plugin, characters keep their own schedules; and several storylines run side by side. A linear story, with no places and no clock, is the simplest case of the same engine.
  - title: Deterministic
    details: Every draw is hashed from the save's seed, a name and what it is keyed on, such as the turn. Same save, same cards — which is what makes undo, snapshots and scripted playtests work.
  - title: Ships as a folder
    details: A built game is an index.html and its pictures. It opens from disk with a double-click and uploads to itch.io as it is. Nothing loads at runtime.
  - title: Content is data
    details: Conditions and effects are plain objects, not code, so the engine can check them and a mod can add to them without shipping a script.
  - title: Genre-neutral
    details: The engine has no opinion about what your game is about. Your game declares its places, people and storylines, and supplies its own rules.
  - title: Pre-release
    details: IFLoom is being lifted out of the game it was built for. Nothing is a stable API yet — see the API status page for what is changing.
---
