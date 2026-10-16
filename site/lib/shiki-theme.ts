/**
 * The docs' one code theme, dark and warm like the homepage's code panel:
 * keywords in ember, strings in a pale orange, types in sand, and comments
 * and punctuation dimmed. Text stays near the page's ink so long listings
 * read easily.
 */
export const emberTheme = {
  name: 'ifloom-ember',
  type: 'dark' as const,
  settings: [
    { settings: { foreground: '#e9e1d7', background: '#0b0908' } },
    { scope: ['comment', 'punctuation.definition.comment'], settings: { foreground: '#857a70', fontStyle: 'italic' } },
    { scope: ['keyword', 'storage', 'storage.type', 'storage.modifier', 'keyword.operator.new', 'keyword.operator.expression', 'keyword.control'], settings: { foreground: '#ff8f5a' } },
    { scope: ['keyword.operator', 'punctuation', 'meta.brace', 'punctuation.separator', 'punctuation.terminator'], settings: { foreground: '#9a8f86' } },
    { scope: ['string', 'string.quoted', 'string.template', 'punctuation.definition.string'], settings: { foreground: '#ffc78a' } },
    { scope: ['constant.numeric', 'constant.language', 'constant.language.boolean', 'constant.character.escape'], settings: { foreground: '#ffb366' } },
    { scope: ['entity.name.type', 'entity.name.class', 'support.type', 'support.class', 'entity.other.inherited-class', 'storage.type.primitive'], settings: { foreground: '#f2d3a8' } },
    { scope: ['entity.name.function', 'support.function', 'meta.function-call entity.name.function'], settings: { foreground: '#ffd9a0' } },
    { scope: ['variable', 'variable.other', 'variable.parameter', 'meta.object-literal.key', 'support.variable.property'], settings: { foreground: '#ece4da' } },
    { scope: ['variable.other.constant', 'variable.other.enummember'], settings: { foreground: '#f7c98f' } },
    { scope: ['entity.name.tag', 'support.class.component'], settings: { foreground: '#ff9e6b' } },
    { scope: ['entity.other.attribute-name'], settings: { foreground: '#f2d3a8' } },
    { scope: ['support.type.property-name', 'meta.object-literal.key string'], settings: { foreground: '#ece4da' } },
    { scope: ['markup.heading', 'entity.name.section'], settings: { foreground: '#ffb46b', fontStyle: 'bold' } },
    { scope: ['markup.inserted'], settings: { foreground: '#b8d98a' } },
    { scope: ['markup.deleted'], settings: { foreground: '#ff7a6b' } },
    { scope: ['invalid'], settings: { foreground: '#ff6b5a' } },
  ],
  colors: {
    'editor.background': '#0b0908',
    'editor.foreground': '#e9e1d7',
  },
}
