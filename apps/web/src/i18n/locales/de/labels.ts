import type { Messages } from '@/i18n/types'

export const labels: Messages['labels'] = {
  jobStatus: {
    to_apply: 'Zu bewerben',
    applied: 'Beworben',
    interviewing: 'Vorstellungsgespräche',
    negotiating: 'Verhandlung',
    accepted: 'Angenommen',
    rejected: 'Abgelehnt',
    no_answer: 'Keine Antwort',
  },
  jobType: {
    remote: 'Remote',
    onsite: 'Vor Ort',
    hybrid: 'Hybrid',
  },
  cvLanguage: {
    'en-US': 'Englisch (USA)',
    'en-GB': 'Englisch (UK)',
    bg: 'Bulgarisch',
  },
  profession: {
    'software-developer': {
      name: 'Softwareentwicklung',
      description: 'Entwickler, Ingenieure, IT- und Datenberufe',
    },
    designer: { name: 'Design', description: 'UI/UX-, Grafik- und Produktdesigner' },
    'sales-marketing': {
      name: 'Vertrieb & Marketing',
      description: 'Vertrieb, Marketing, Account- und Businessrollen',
    },
    healthcare: {
      name: 'Gesundheitswesen',
      description: 'Pflegekräfte, Ärzte, Therapeuten und Betreuung',
    },
    academic: {
      name: 'Wissenschaft & Forschung',
      description: 'Forschende, Lehrende und Promovierende',
    },
  },
  template: {
    polished: 'Elegant',
    contemporary: 'Zeitgemäß',
    creative: 'Kreativ',
    timeline: 'Zeitleiste',
    stylish: 'Stilvoll',
    'single-column': 'Einspaltig',
    compact: 'Kompakt',
    multicolumn: 'Mehrspaltig',
  },
  documentType: {
    cv: 'Lebenslauf',
    coverLetter: 'Anschreiben',
  },
}
