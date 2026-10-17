import type { CvDocument } from '../cv/document'
import type { ProfessionId } from '../cv/professions'
import { buildExample, range } from './build'

const examples: Record<ProfessionId, () => CvDocument> = {
  'software-developer': () =>
    buildExample(
      {
        name: 'Alex Petrov',
        headline: 'Senior Frontend Engineer',
        email: 'alex.petrov@example.com',
        phone: '+359 888 123 456',
        location: 'Sofia, Bulgaria',
        link: 'github.com/alexpetrov',
      },
      [
        {
          type: 'summary',
          column: 'main',
          text: 'Frontend engineer with 7 years of experience building fast, accessible React applications. I enjoy turning complex workflows into simple interfaces and mentoring teams on TypeScript and testing.',
        },
        {
          type: 'experience',
          column: 'main',
          showLogos: true,
          items: [
            {
              title: 'Senior Frontend Engineer',
              company: 'Northwind Labs',
              location: 'Sofia (hybrid)',
              ...range('2022-03'),
              logoUrl: null,
              bullets: [
                'Led the migration of a 200k-line app to TypeScript and React 19, cutting runtime errors by 60%.',
                'Built a design system used by 5 product teams, reducing UI delivery time by 30%.',
              ],
            },
            {
              title: 'Frontend Developer',
              company: 'Blue Harbor',
              location: 'Plovdiv',
              ...range('2019-01', '2022-02'),
              logoUrl: null,
              bullets: [
                'Developed a real-time analytics dashboard for 40k daily users.',
                'Introduced end-to-end tests with Playwright, raising release confidence.',
              ],
            },
          ],
        },
        {
          type: 'projects',
          column: 'main',
          items: [
            {
              name: 'Open-source form library',
              role: 'Maintainer',
              link: 'github.com/alexpetrov/forms',
              ...range('2021-06'),
              description: 'Type-safe form state for React with 2k GitHub stars.',
              bullets: [],
            },
          ],
        },
        {
          type: 'skills',
          column: 'sidebar',
          levelDisplay: 'dots',
          items: [
            { name: 'TypeScript', level: 5 },
            { name: 'React', level: 5 },
            { name: 'Node.js', level: 4 },
            { name: 'PostgreSQL', level: 3 },
            { name: 'Testing (Vitest, Playwright)', level: 4 },
          ],
        },
        {
          type: 'achievements',
          column: 'sidebar',
          items: [
            {
              icon: 'rocket',
              title: 'Page load 2× faster',
              description: 'Code splitting and caching halved load time on the main product.',
            },
          ],
        },
        {
          type: 'education',
          column: 'sidebar',
          items: [
            {
              degree: 'BSc Computer Science',
              institution: 'Sofia University',
              location: 'Sofia',
              ...range('2014-09', '2018-06'),
              bullets: [],
            },
          ],
        },
        {
          type: 'certificates',
          column: 'sidebar',
          items: [
            {
              name: 'AWS Certified Developer',
              issuer: 'Amazon Web Services',
              date: '2023-05',
              expiryDate: '2026-05',
              link: 'aws.amazon.com/verification',
            },
          ],
        },
        {
          type: 'languages',
          column: 'sidebar',
          levelDisplay: 'dots',
          items: [
            { name: 'Bulgarian', level: 5 },
            { name: 'English', level: 5 },
            { name: 'German', level: 2 },
          ],
        },
      ],
      { templateId: 'polished', accentColor: '#00585a' },
    ),

  designer: () =>
    buildExample(
      {
        name: 'Maria Ivanova',
        headline: 'Product Designer',
        email: 'maria.ivanova@example.com',
        phone: '+359 887 654 321',
        location: 'Varna, Bulgaria',
        link: 'mariaivanova.design',
      },
      [
        {
          type: 'summary',
          column: 'main',
          text: 'Product designer focused on research-driven, accessible interfaces for web and mobile. Comfortable from discovery workshops to pixel-perfect handoff.',
        },
        {
          type: 'experience',
          column: 'main',
          showLogos: true,
          items: [
            {
              title: 'Senior Product Designer',
              company: 'Pixel & Pine',
              location: 'Remote',
              ...range('2021-04'),
              logoUrl: null,
              bullets: [
                'Redesigned onboarding, increasing activation by 18%.',
                'Ran 30+ user interviews and turned findings into a shared research library.',
              ],
            },
            {
              title: 'UI Designer',
              company: 'Seaside Studio',
              location: 'Varna',
              ...range('2018-07', '2021-03'),
              logoUrl: null,
              bullets: ['Designed e-commerce sites for 15 clients in tourism and retail.'],
            },
          ],
        },
        {
          type: 'projects',
          column: 'main',
          items: [
            {
              name: 'Accessible color toolkit',
              role: 'Creator',
              link: 'mariaivanova.design/colors',
              ...range('2023-01', '2023-06'),
              description: 'Figma plugin that checks contrast and suggests accessible palettes.',
              bullets: [],
            },
          ],
        },
        {
          type: 'skills',
          column: 'sidebar',
          levelDisplay: 'bar',
          items: [
            { name: 'Figma', level: 5 },
            { name: 'User research', level: 4 },
            { name: 'Prototyping', level: 5 },
            { name: 'Design systems', level: 4 },
          ],
        },
        {
          type: 'education',
          column: 'sidebar',
          items: [
            {
              degree: 'BA Graphic Design',
              institution: 'National Academy of Arts',
              location: 'Sofia',
              ...range('2014-09', '2018-06'),
              bullets: [],
            },
          ],
        },
        {
          type: 'courses',
          column: 'sidebar',
          items: [
            { title: 'Google UX Design Certificate', institution: 'Coursera', date: '2020-11' },
          ],
        },
        {
          type: 'languages',
          column: 'sidebar',
          levelDisplay: 'text',
          items: [
            { name: 'Bulgarian', level: 5 },
            { name: 'English', level: 4 },
          ],
        },
      ],
      { templateId: 'creative', accentColor: '#6b21a8', fontFamily: 'Montserrat' },
    ),

  'sales-marketing': () =>
    buildExample(
      {
        name: 'Daniel Georgiev',
        headline: 'B2B Sales Manager',
        email: 'daniel.georgiev@example.com',
        phone: '+359 889 222 333',
        location: 'Sofia, Bulgaria',
        link: 'linkedin.com/in/danielgeorgiev',
      },
      [
        {
          type: 'summary',
          column: 'main',
          text: 'Results-driven sales manager with a record of growing SaaS revenue in Central and Eastern Europe. Builds long-term client relationships and coaches high-performing teams.',
        },
        {
          type: 'experience',
          column: 'main',
          showLogos: true,
          items: [
            {
              title: 'Sales Manager, CEE',
              company: 'CloudCart Solutions',
              location: 'Sofia',
              ...range('2020-02'),
              logoUrl: null,
              bullets: [
                'Grew annual recurring revenue from €1.2M to €3.4M in three years.',
                'Hired and coached a team of 6 account executives.',
              ],
            },
            {
              title: 'Account Executive',
              company: 'MarketPulse',
              location: 'Sofia',
              ...range('2016-05', '2020-01'),
              logoUrl: null,
              bullets: ['Exceeded quota 11 quarters in a row, averaging 124% attainment.'],
            },
          ],
        },
        {
          type: 'achievements',
          column: 'sidebar',
          items: [
            {
              icon: 'trophy',
              title: 'Top performer 2022',
              description: 'Highest closed revenue across EMEA.',
            },
            {
              icon: 'handshake',
              title: '40+ enterprise deals',
              description: 'Average deal size €45k.',
            },
          ],
        },
        {
          type: 'skills',
          column: 'sidebar',
          levelDisplay: 'pills',
          items: [
            { name: 'Negotiation', level: null },
            { name: 'HubSpot & Salesforce', level: null },
            { name: 'Pipeline forecasting', level: null },
            { name: 'Team leadership', level: null },
          ],
        },
        {
          type: 'education',
          column: 'sidebar',
          items: [
            {
              degree: 'BA Marketing',
              institution: 'University of National and World Economy',
              location: 'Sofia',
              ...range('2011-09', '2015-06'),
              bullets: [],
            },
          ],
        },
        {
          type: 'languages',
          column: 'sidebar',
          levelDisplay: 'text',
          items: [
            { name: 'Bulgarian', level: 5 },
            { name: 'English', level: 5 },
            { name: 'Russian', level: 3 },
          ],
        },
      ],
      { templateId: 'polished', accentColor: '#1f4e79' },
    ),

  healthcare: () =>
    buildExample(
      {
        name: 'Elena Dimitrova',
        headline: 'Registered Nurse, Intensive Care',
        email: 'elena.dimitrova@example.com',
        phone: '+359 886 444 555',
        location: 'Plovdiv, Bulgaria',
        link: '',
      },
      [
        {
          type: 'summary',
          column: 'main',
          text: 'Compassionate ICU nurse with 9 years of experience in critical care, patient education and mentoring new staff.',
        },
        {
          type: 'experience',
          column: 'main',
          showLogos: false,
          items: [
            {
              title: 'ICU Nurse',
              company: 'St. George University Hospital',
              location: 'Plovdiv',
              ...range('2018-01'),
              logoUrl: null,
              bullets: [
                'Care for up to 3 critically ill patients per shift in a 20-bed ICU.',
                'Mentor newly hired nurses through a 3-month onboarding program.',
              ],
            },
            {
              title: 'Staff Nurse, Internal Medicine',
              company: 'City Hospital',
              location: 'Plovdiv',
              ...range('2015-09', '2017-12'),
              logoUrl: null,
              bullets: ['Administered medication and monitored patients on a 35-bed ward.'],
            },
          ],
        },
        {
          type: 'education',
          column: 'main',
          items: [
            {
              degree: 'Bachelor of Nursing',
              institution: 'Medical University of Plovdiv',
              location: 'Plovdiv',
              ...range('2011-09', '2015-06'),
              bullets: [],
            },
          ],
        },
        {
          type: 'certificates',
          column: 'sidebar',
          items: [
            {
              name: 'Advanced Cardiac Life Support (ACLS)',
              issuer: 'ERC',
              date: '2024-03',
              expiryDate: '2026-03',
              link: '',
            },
            {
              name: 'Basic Life Support (BLS)',
              issuer: 'ERC',
              date: '2024-03',
              expiryDate: '2026-03',
              link: '',
            },
          ],
        },
        {
          type: 'skills',
          column: 'sidebar',
          levelDisplay: 'bullets',
          items: [
            { name: 'Ventilator management', level: null },
            { name: 'Patient assessment', level: null },
            { name: 'Electronic health records', level: null },
          ],
        },
        {
          type: 'languages',
          column: 'sidebar',
          levelDisplay: 'text',
          items: [
            { name: 'Bulgarian', level: 5 },
            { name: 'English', level: 3 },
          ],
        },
      ],
      { templateId: 'single-column', accentColor: '#0e7490', fontFamily: 'Source Sans 3' },
    ),

  academic: () =>
    buildExample(
      {
        name: 'Dr. Nikolai Stoyanov',
        headline: 'Postdoctoral Researcher in Machine Learning',
        email: 'n.stoyanov@example.edu',
        phone: '+359 885 777 888',
        location: 'Sofia, Bulgaria',
        link: 'scholar.google.com/citations?user=example',
      },
      [
        {
          type: 'summary',
          column: 'main',
          text: 'Researcher working on efficient deep learning for low-resource languages, with 12 peer-reviewed publications and teaching experience at undergraduate and master level.',
        },
        {
          type: 'education',
          column: 'main',
          items: [
            {
              degree: 'PhD Computer Science',
              institution: 'Sofia University',
              location: 'Sofia',
              ...range('2017-10', '2021-09'),
              bullets: ['Thesis: Compact language models for Slavic languages.'],
            },
            {
              degree: 'MSc Artificial Intelligence',
              institution: 'University of Edinburgh',
              location: 'Edinburgh, UK',
              ...range('2015-09', '2016-09'),
              bullets: [],
            },
          ],
        },
        {
          type: 'experience',
          column: 'main',
          showLogos: false,
          items: [
            {
              title: 'Postdoctoral Researcher',
              company: 'INSAIT',
              location: 'Sofia',
              ...range('2021-10'),
              logoUrl: null,
              bullets: [
                'Lead a team of 4 PhD students on multilingual model compression.',
                'Secured a €250k national research grant as co-investigator.',
              ],
            },
          ],
        },
        {
          type: 'projects',
          column: 'main',
          items: [
            {
              name: 'BG-NLP benchmark',
              role: 'Principal author',
              link: '',
              ...range('2022-01', '2023-12'),
              description: 'Open benchmark of 9 Bulgarian NLP tasks, adopted by 3 research groups.',
              bullets: [],
            },
          ],
        },
        {
          type: 'skills',
          column: 'sidebar',
          levelDisplay: 'none',
          items: [
            { name: 'PyTorch', level: null },
            { name: 'Natural language processing', level: null },
            { name: 'Statistical analysis', level: null },
            { name: 'Academic writing', level: null },
          ],
        },
        {
          type: 'courses',
          column: 'sidebar',
          items: [
            {
              title: 'Teaching in Higher Education',
              institution: 'Sofia University',
              date: '2019-02',
            },
          ],
        },
        {
          type: 'languages',
          column: 'sidebar',
          levelDisplay: 'text',
          items: [
            { name: 'Bulgarian', level: 5 },
            { name: 'English', level: 5 },
          ],
        },
      ],
      { templateId: 'single-column', accentColor: '#1d4ed8', fontFamily: 'Merriweather' },
    ),
}

/** A fresh example CV for a profession, used by "Start from example" and as mock data. */
export function createExampleCv(professionId: ProfessionId): CvDocument {
  return examples[professionId]()
}
