---
title: "Render the calendar, locations and people"
description: "How-to for rendering the calendar, places and cast plugins in a UI of your own, in plain JS, React and Vue: the clock, the location the player is at with its exits and the things lying there, and the people here and everyone met."
---
Render the world around the story: the time of day from the [calendar](/docs/reference/plugins/calendar), the [location](/docs/reference/glossary#location) the player is at from [places](/docs/reference/plugins/places), and the people from the [cast](/docs/reference/plugins/cast). Set up the runner first, as [Start your own UI](/docs/how-to/render/start) shows. In the React tabs, each plugin's UI comes from its `/react` subpath and goes in `mountGame`'s `plugins`, as [Show plugins in the React UI](/docs/how-to/react/show-plugin-uis) explains.

## Render the clock

`view.plugins.calendar` holds the time as a [`CalendarView`](/docs/api/plugin-calendar#calendarview), with the day, the weekday, the period and the whole line in `label`, which is also in `view.when`. The React UI's [`CalendarClock`](/docs/api/plugin-calendar#calendarclock), from `calendarUi`, renders in place of the React UI's own `Clock`, in the side column and in the top bar on a phone.

::include[../../../../../snippets/plain/calendar.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-calendar.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Calendar.vue]{meta='tab="Vue" tab-group="framework"'}

Put the day, the weekday and the period on the clock's element as data attributes, so a stylesheet can colour the night. `curfew` is true in the last period of the day while the curfew binds, which is the moment to send the player to bed. `CalendarClock` sets `data-day`, `data-weekday`, `data-period` and `data-curfew` the same way, and [`useCalendar`](/docs/api/plugin-calendar#usecalendar) gives you the calendar's view in a React component of your own.

## Render the location and its exits

`view.plugins.places` holds where the player is as a [`PlacesView`](/docs/api/plugin-places#placesview), with the `location`, its `exits` and the `things` lying there. The React UI's [`LocationCard`](/docs/api/plugin-places#locationcard) and [`Exits`](/docs/api/plugin-places#exits), from `placesUi`, go in the story before the room's actions.

::include[../../../../../snippets/plain/places.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-places.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/Place.vue]{meta='tab="Vue" tab-group="framework"'}

Each exit and each thing's `pickUp` is a ready button, a [`RenderedChoice`](/docs/api/engine#renderedchoice), so render it as any other button and send its `command`. An exit the player can't take has its reason in `disabled`, and an exit a lock hides isn't in the view at all. The location's name and words are also the room scene in `view.scene`, and its own actions are in `view.actions`, which [Render the scene and its choices](/docs/how-to/render/scene) renders.

`location` is null while the player is nowhere, so render nothing then. A location with a picture has it in `location.picture`, which [Render pictures and play sound](/docs/how-to/render/pictures-and-sound) renders, and the plugin leaves its hotspots out while a scene is open. [`usePlaces`](/docs/api/plugin-places#useplaces) gives the view with `go` and `pickUp` to a React component of your own.

## Render the people

`view.plugins.cast` holds the people as a [`CastView`](/docs/api/plugin-cast#castview), with who is here in `present` and everyone in `people`, each a [`PersonView`](/docs/api/plugin-cast#personview). The React UI's `castUi` puts [`PeopleHere`](/docs/api/plugin-cast#peoplehere) after the room's actions, and a People section in the side column that opens [`Relationships`](/docs/api/plugin-cast#relationships) in a dialog.

::include[../../../../../snippets/plain/cast.ts]{meta='tab="Plain JS" tab-group="framework"'}

::include[../../../../../snippets/react/mount-cast.tsx]{meta='tab="React" tab-group="framework"'}

::include[../../../../../snippets/vue/People.vue]{meta='tab="Vue" tab-group="framework"'}

Each person has a name, a portrait, a `description` and their buttons in `actions`, such as **Talk**. `met` says whether the player has met them, and `here` whether they're at the player's location. `present` is empty while a scene is open. A character is an [entity](/docs/reference/glossary#entity) of the cast's kind, so the stats the player can see on them, such as friendship, are on their entry in `view.entities` while the game lists the kind. [`usePeople`](/docs/api/plugin-cast#usepeople) gives the cast's view to a React component of your own.

For more on what these sections render, see:

- [Calendar](/docs/reference/plugins/calendar), [Places](/docs/reference/plugins/places) and [Cast](/docs/reference/plugins/cast).
- [The view](/docs/reference/view).
- [Set up days and times of day](/docs/how-to/set-up-the-clock), [Add a location](/docs/how-to/add-a-location) and [Add a character with a schedule](/docs/how-to/add-a-character).
