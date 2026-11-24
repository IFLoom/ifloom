---
title: "Render pictures and play sound"
description: "How-to for rendering a scene's layered picture with its hotspots, and playing the game's music, sounds and voices, in a UI of your own in plain JS, React and Vue."
---
Render a scene's [picture](/docs/reference/glossary#picture), its layers and hotspots, and play the game's music, sounds and voiced lines. Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. A picture or a clip inside the prose is a beat, which [Render the scene](/docs/how-to/render/scene#render-the-scene) covers.

## Render the scene's picture

`view.scene.picture` holds the scene's layered picture as a [`PictureView`](/docs/api/engine#pictureview), and `view.scene.image` a single picture when the scene has no layers. The React UI's `Scene` renders the picture above the words with [`LayeredPicture`](/docs/api/react#layeredpicture), which you can also place yourself.

::include[../../../../../snippets/plain/picture.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/picture.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Picture.vue]{meta='tab="Vue" tab-group="framework"'}

Stack the `layers` bottom first. A layer with `video` set is a clip rather than a picture. The engine lists only the layers whose `when` holds and resolves a pool's pick, so render each layer in the list. Put each of the `hotspots` over the layers as a button, placed by its `rect`, the left, top, width and height in percent of the picture. A hotspot is a [`HotspotView`](/docs/api/engine#hotspotview), greyed out with `disabled` like any button, and it sends its `command`.

The places plugin gives a location's picture in its own view, and [Render the calendar, locations and people](/docs/how-to/render/world-plugins) renders it the same way.

## Play sound

`view.audio` holds what each channel should play and the sounds that are due, as an [`AudioView`](/docs/api/engine#audioview), and the audio player plays it. The React UI's `mountGame` plays the game's sound itself, and `Scene` puts a replay button on each spoken line with a voice.

::include[../../../../../snippets/plain/audio.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/audio.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Audio.vue]{meta='tab="Vue" tab-group="framework"'}

Start [`startAudio`](/docs/api/audio#startaudio) once, beside the runner, never inside a component that comes and goes. It follows the runner rather than your components, so it plays the same whatever renders the page. Nothing plays until the player first clicks or presses a key, because browsers allow no sound sooner. Pass `{ log: console.debug }` to see each thing the player does in the console.

The player sets each channel's volume from the ui setting the game's `audio` names for it, so a volume slider on your settings screen works with no code of yours. A spoken line with a voice is a `say` beat with `voice`, a track id. To play it again, look the track up in the game's `audio.tracks` and call the player's [`play`](/docs/api/audio#audioplayer) with its file, through `audioSrc`.

For more on what these sections render, see:

- [Media](/docs/reference/media) and [Audio](/docs/reference/audio).
- [The audio player](/docs/api/audio).
- [Add pictures and backgrounds](/docs/how-to/add-pictures-and-backgrounds) and [Add music and sound](/docs/how-to/add-music-and-sound).
