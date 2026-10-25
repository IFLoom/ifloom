/** Ava's words, by key. Choice labels are `<scene>#<choice>`; reply labels `<message>#<reply>`. */
export const prose: Record<string, string> = {
  // A paragraph in quotes is a spoken line, so narration goes in its own paragraph.
  // `[[ui:image|…]]` is the React UI's: her name opens her photo in the viewer.
  'ava.hi':
    '[[ui:image|Ava|photo/ava.svg|Ava at the café counter]] looks up from the till and grins.\n\n"You’re the one above the launderette. Welcome to the worst-kept secret in town: me."',
  // Named lines: they follow another of Ava's, and a bare quote there would read as the player's.
  'ava.smalltalk.rain': 'Ava: "Rain later. The ducks know before the forecast does."',
  'ava.smalltalk.beans': 'Ava: "New beans this week. Tell me if they’re awful. Nobody else will."',
  'ava.smalltalk.river': 'Ava: "Walk the river at dusk sometime. It’s the only quiet in town."',
  'ava.hi.regular': 'She has your cup out before you ask.',
  'ava.hi.shell': 'The river shell sits by the till, holding down the receipts.',
  'ava.hi#shell': 'Give her the shell from the river',
  'ava.hi#chat': 'Chat for a minute',
  'ava.hi#compliment': 'Tell her the café is the best thing in town',
  'ava.hi#work': 'Ask about weekend work',
  'ava.hi#bye': 'Leave her to it',
  'ava.call': '"Oh, hello! I’m on the bench by the river. Come and find me some evening."',
  'ava.call#bye': 'Say goodnight',
  'ava.river': 'Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.',
  'ava.river.2': '"I told you it was the only quiet in town." She shuffles up to make room.',
  'ava.text': 'Good to meet you yesterday! Coffee’s on me next time 🙂',
  'ava.text#yes': 'Deal!',
  'ava.text#later': 'Maybe later in the week',
  // Ava's small talk by text: a pool of messages, one drawn each day.
  'ava.chat.rain': 'Rain later. The ducks know before the forecast does.',
  'ava.chat.beans': 'New beans this week. Tell me if they’re *awful*. Nobody else will.',
  'ava.chat.beans#taste': 'I’ll come and taste them',
  'ava.chat.river': 'Walk the river at dusk sometime. It’s the only quiet in town.',
  'ava.chat.ducks': 'A duck walked into the café this morning. **Walked in.** Then out again.',
  'feed.ava-cake': 'Lemon drizzle today. It will not last until noon.',
}
