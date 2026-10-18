// Self-hosted fonts (free, from Fontsource). Each package includes Latin and Cyrillic
// subsets; the browser only downloads the files for fonts and characters actually used.
import '@fontsource-variable/inter'
import '@fontsource-variable/lora'
// The Elegant template's name is in italics.
import '@fontsource-variable/lora/wght-italic.css'
import '@fontsource-variable/merriweather'
import '@fontsource-variable/montserrat'
import '@fontsource-variable/noto-serif'
import '@fontsource-variable/open-sans'
import '@fontsource-variable/roboto'
import '@fontsource-variable/rubik'
import '@fontsource-variable/source-sans-3'
import '@fontsource/pt-sans/400.css'
import '@fontsource/pt-sans/700.css'
import type { FontFamily } from '@cv/shared'

const SANS = 'system-ui, sans-serif'
const SERIF = 'Georgia, serif'

export const FONT_STACKS: Record<FontFamily, string> = {
  Rubik: `'Rubik Variable', ${SANS}`,
  Inter: `'Inter Variable', ${SANS}`,
  Roboto: `'Roboto Variable', ${SANS}`,
  'Open Sans': `'Open Sans Variable', ${SANS}`,
  Montserrat: `'Montserrat Variable', ${SANS}`,
  'Source Sans 3': `'Source Sans 3 Variable', ${SANS}`,
  'PT Sans': `'PT Sans', ${SANS}`,
  Merriweather: `'Merriweather Variable', ${SERIF}`,
  Lora: `'Lora Variable', ${SERIF}`,
  'Noto Serif': `'Noto Serif Variable', ${SERIF}`,
}
