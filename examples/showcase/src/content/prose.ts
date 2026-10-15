/** Small Town's words, by key. Choice labels are `<scene>#<choice>`; reply labels `<message>#<reply>`. */
export const prose: Record<string, string> = {
  intro:
    'The van pulls away and leaves you on the pavement with three boxes, a key and a cat in a basket. The flat is above a launderette; it smells of warm cotton.\n\nTomorrow you start learning the town. Tonight you unpack, and the cat needs a name.',
  'intro#unpack': 'Unpack',

  'place.flat': 'Boxes, mostly. The window looks over the high street, and the radiator knocks when it feels like it. {{v:catName}} has claimed the warm spot on the sill.',
  'place.high-street': 'A bakery, a launderette, a bus stop with a bench nobody sits on. The café on the corner has its door propped open.',
  'place.high-street/hint': 'Hint: the café is open in the day, and whoever runs it likes a chat.',
  'place.cafe': 'Six tables, one of them wobbly. The coffee machine sighs like it has been working since dawn, which it has.',
  'place.cafe/ava': 'Ava is behind the counter, flour to the elbows, and nods you in.',
  'place.cafe/raincoat': 'Someone points at your raincoat and grins. It is very yellow.',
  'place.park': 'The river is slow and brown and full of ducks with opinions.',
  'place.office': 'Strip lights, a kettle, a stack of forms that never gets shorter.',

  // A paragraph in quotes is a spoken line, so narration goes in its own paragraph.
  'ava.hi': 'Ava looks up from the till and grins.\n\n"You’re the one above the launderette. Welcome to the worst-kept secret in town: me."',
  // Named lines: they follow another of Ava's, and a bare quote there would read as the player's.
  'ava.smalltalk/rain': 'Ava: "Rain later. The ducks know before the forecast does."',
  'ava.smalltalk/beans': 'Ava: "New beans this week. Tell me if they’re awful. Nobody else will."',
  'ava.smalltalk/river': 'Ava: "Walk the river at dusk sometime. It’s the only quiet in town."',
  'ava.hi/regular': 'She has your cup out before you ask.',
  'ava.hi#chat': 'Chat for a minute',
  'ava.hi#compliment': 'Tell her the café is the best thing in town',
  'ava.hi#bye': 'Leave her to it',
  'ava.call': '"Oh, hello! I’m on the bench by the river. Come and find me some evening."',
  'ava.call#bye': 'Say goodnight',

  'ava.river':
    'Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.\n\n"I told you it was the only quiet in town." She shuffles up to make room.',
  'ava.river#stay': 'Sit with her until the light goes',
  'street.weather/drizzle': 'A fine drizzle that never quite becomes rain.',
  'street.weather/sun': 'Sun on the shopfronts; someone has put a chair out on the pavement.',
  'street.weather/wind': 'Wind down the street, rattling the bakery sign.',
  'sam.hi': 'Sam is walking a dog that is clearly not theirs. "Dog-sitting," they say. "He’s in charge."',
  'sam.hi#bye': 'Pat the dog and go',

  'notice.welcome': 'Welcome to the building! Bins go out Thursday. The radiator knocks; ignore it. — Sam, flat 2',

  'ava.text': 'Good to meet you yesterday! Coffee’s on me next time 🙂',
  'ava.text#yes': 'Deal!',
  'ava.text#later': 'Maybe later in the week',

  'feed.ava-cake': 'Lemon drizzle today. It will not last until noon.',
  'feed.sam-river': 'The ducks have unionised.',
  'post.photo': 'New town, new faces.',
  'comment.nice': 'Lovely!',
}
