import type { Messages } from '@/i18n/types'

export const design: Messages['design'] = {
  pageMargins: {
    label: 'Seitenränder',
    min: 'schmal',
    max: 'breit',
    decrease: 'Seitenränder verkleinern',
    increase: 'Seitenränder vergrößern',
  },
  sectionSpacing: {
    label: 'Abstand zwischen Abschnitten',
    min: 'kompakt',
    max: 'mehr Platz',
    decrease: 'Abstand zwischen Abschnitten verkleinern',
    increase: 'Abstand zwischen Abschnitten vergrößern',
  },
  fontSize: {
    label: 'Schriftgröße',
    min: '−A',
    max: '+A',
    decrease: 'Schriftgröße verkleinern',
    increase: 'Schriftgröße vergrößern',
    names: {
      xs: 'Sehr klein',
      s: 'Klein',
      m: 'Mittel',
      l: 'Groß',
      xl: 'Sehr groß',
    },
  },
  lineHeight: {
    label: 'Zeilenabstand',
    min: 'eng',
    max: 'weit',
    decrease: 'Zeilenabstand verkleinern',
    increase: 'Zeilenabstand vergrößern',
  },
  colors: {
    title: 'Farben',
    accent: 'Akzentfarbe',
    preset: 'Farbe {{color}}',
    useCustom: 'Eigene Farbe verwenden',
    custom: 'Eigene Farbe',
    hex: 'Hex-Code der eigenen Farbe',
    lowContrastFilled:
      'Diese Farbe ist hell: Weißer Text darauf ist möglicherweise schwer lesbar. Ein dunklerer Ton eignet sich besser.',
    lowContrastText:
      'Diese Farbe ist hell: Farbiger Text ist möglicherweise schwer lesbar. Ein dunklerer Ton eignet sich besser.',
  },
  font: {
    title: 'Schriftart',
    current: 'Schrift: {{font}}',
    list: 'Schriften',
    note: 'Alle Schriften unterstützen lateinische und kyrillische Zeichen.',
  },
  columns: {
    title: 'Spaltenlayout',
    single: '„{{template}}“ hat nur eine Spalte.',
    option: 'Spaltenlayout {{n}}',
  },
  backgrounds: {
    title: 'Hintergründe',
    label: 'Hintergrund',
    names: {
      none: 'Schlicht',
      dots: 'Punkte',
      grid: 'Raster',
      diagonal: 'Diagonale Linien',
      cross: 'Kreuze',
      waves: 'Wellen',
      hexagons: 'Sechsecke',
      corner: 'Eckenglühen',
    },
  },
  reset: 'Auf Standard von „{{template}}“ zurücksetzen',
}
