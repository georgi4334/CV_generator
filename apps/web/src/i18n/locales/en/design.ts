/** The Design & Font panel. */
export const design = {
  pageMargins: {
    label: 'Page margins',
    min: 'narrow',
    max: 'wide',
    decrease: 'Decrease page margins',
    increase: 'Increase page margins',
  },
  sectionSpacing: {
    label: 'Section spacing',
    min: 'compact',
    max: 'more space',
    decrease: 'Decrease section spacing',
    increase: 'Increase section spacing',
  },
  fontSize: {
    label: 'Font size',
    min: '−A',
    max: '+A',
    decrease: 'Decrease font size',
    increase: 'Increase font size',
    names: {
      xs: 'Extra small',
      s: 'Small',
      m: 'Medium',
      l: 'Large',
      xl: 'Extra large',
    },
  },
  lineHeight: {
    label: 'Line height',
    min: 'condensed',
    max: 'spacious',
    decrease: 'Decrease line height',
    increase: 'Increase line height',
  },
  colors: {
    title: 'Colors',
    accent: 'Accent color',
    preset: 'Color {{color}}',
    useCustom: 'Use custom color',
    custom: 'Custom color',
    hex: 'Custom color hex code',
    lowContrastFilled:
      'This color is light: white text on it may be hard to read. A darker shade works better.',
    lowContrastText:
      'This color is light: colored text may be hard to read. A darker shade works better.',
  },
  font: {
    title: 'Font style',
    current: 'Font: {{font}}',
    list: 'Fonts',
    note: 'All fonts support Latin and Cyrillic.',
  },
  columns: {
    title: 'Column layout',
    single: '{{template}} uses a single column.',
    option: 'Column layout {{n}}',
  },
  backgrounds: {
    title: 'Backgrounds',
    label: 'Background',
    names: {
      none: 'Plain',
      dots: 'Dots',
      grid: 'Grid',
      diagonal: 'Diagonal lines',
      cross: 'Crosses',
      waves: 'Waves',
      hexagons: 'Hexagons',
      corner: 'Corner glow',
    },
  },
  reset: 'Reset to {{template}} defaults',
}
