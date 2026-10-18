/** Small Town's words, by key. Choice labels are `<scene>#<choice>`; reply labels `<message>#<reply>`. */
export const prose: Record<string, string> = {
  // `*…*` is italics and `**…**` bold, inside the line.
  intro: 'The van pulls away and leaves you on the pavement with three boxes, a key and *a cat in a basket*. The flat is above a [[tip:intro.launderette|launderette]]; it smells of **warm cotton**.',
  // The tooltip on "launderette" above.
  'intro.launderette': 'Sam from flat 2 runs it. Service washes, Monday to Saturday.',
  // Revealed after the line above: the scene's block says so with `reveal`.
  'intro.tonight': 'Tomorrow you start learning the town. Tonight you unpack, and the cat needs a name.',
  'intro#unpack': 'Unpack',

  'place.flat': 'Boxes, mostly. The window looks over the high street, and the radiator knocks when it feels like it. {{v:catName}} has claimed the warm spot on the sill.',
  // `[[act:read-text|…]]` draws the flat's "Read your messages" action here, in the line.
  'place.flat.text': 'Your phone buzzes on the sill: a message. [[act:read-text|Check it]].',
  'place.high-street': 'A bakery, a launderette, a bus stop with a bench nobody sits on. The café on the corner has its door propped open.',
  'place.high-street.hint': 'Hint: the café is open in the day, and whoever runs it likes a chat.',
  'place.cafe': 'Six tables, one of them wobbly. The coffee machine sighs like it has been working since dawn, which it has.',
  'place.cafe.ava': 'Ava is behind the counter, flour to the elbows, and nods you in.',
  'place.cafe.raincoat': 'Someone points at your raincoat and grins. It is very yellow.',
  'place.cafe.caffeinated': 'Your knee won’t stop jiggling under the table. The coffee is working.',
  'place.park': 'The river is slow and brown and full of ducks with opinions.',
  'place.park.visitors': 'A few people are out along the path today, walking off their lunch.',
  'place.office': 'Strip lights, a kettle, a stack of forms that never gets shorter.',

  // A paragraph in quotes is a spoken line, so narration goes in its own paragraph.
  'ava.hi': 'Ava looks up from the till and grins.\n\n"You’re the one above the launderette. Welcome to the worst-kept secret in town: me."',
  // Named lines: they follow another of Ava's, and a bare quote there would read as the player's.
  'ava.smalltalk.rain': 'Ava: "Rain later. The ducks know before the forecast does."',
  'ava.smalltalk.beans': 'Ava: "New beans this week. Tell me if they’re awful. Nobody else will."',
  'ava.smalltalk.river': 'Ava: "Walk the river at dusk sometime. It’s the only quiet in town."',
  'ava.hi.regular': 'She has your cup out before you ask.',
  'ava.hi#chat': 'Chat for a minute',
  'ava.hi#compliment': 'Tell her the café is the best thing in town',
  'ava.hi#work': 'Ask about weekend work',
  'ava.hi#bye': 'Leave her to it',
  'ava.call': '"Oh, hello! I’m on the bench by the river. Come and find me some evening."',
  'ava.call#bye': 'Say goodnight',

  'ava.river':
    // `[[reveal]]` on a line of its own: what follows comes a moment later.
    'Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.\n\n[[reveal:1500|slide-up]]\n\n"I told you it was the only quiet in town." She shuffles up to make room.',
  'ava.river#stay': 'Sit with her until the light goes',
  'street.weather.drizzle': 'A fine drizzle that never quite becomes rain.',
  'street.weather.sun': 'Sun on the shopfronts; someone has put a chair out on the pavement.',
  'street.weather.wind': 'Wind down the street, rattling the bakery sign.',
  'cafe.window': 'You take the stool by the window. A bus goes by, then a man with a ladder, then the same bus the other way.',
  'cafe.window#leave': 'Finish your cup',
  'cafe.crossword':
    'The man at the next table taps his paper with a pencil.\n\n"Seven down. Somewhere to sit and wait, four letters." He looks at you over his glasses.\n\nYou try "café". He counts the squares, and writes it in.',
  'cafe.crossword#leave': 'Leave him to it',
  'cafe.break': 'Ava drops into the chair opposite with a mug of her own.\n\n"Five minutes. Don’t tell anyone I sat down."',
  'cafe.break#leave': 'Keep her secret',
  'cafe.quiet': 'Nothing much happens. The coffee machine sighs, and you let it.',
  'cafe.quiet#leave': 'Get up',
  'arrows.up': 'The girl with the whistle points at the sky. Up!',
  'arrows.down': 'She points at her shoes. Down!',
  'arrows.left': 'She points at the river. Left!',
  'arrows.right': 'She points at the swings. Right!',
  'park.arrows-won': 'The kids count it up on their fingers and agree, grudgingly, that you win. Five coins change hands from a jam jar.',
  'park.arrows-won#leave': 'Bow',
  'park.arrows-lost': '"Too slow!" They are already picking a new grown-up to beat.',
  'park.arrows-lost#leave': 'Retire with dignity',
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
