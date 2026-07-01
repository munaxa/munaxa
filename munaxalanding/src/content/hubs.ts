import type { Localized } from './types';
import type { ContentKind } from './types';

/** Metadata for the section hub (index) pages: /features, /solutions, … */
export interface Hub {
  kind: ContentKind;
  path: string;
  name: Localized<string>;
  seoTitle: Localized<string>;
  metaDescription: Localized<string>;
  headline: Localized<string>;
  intro: Localized<string>;
  keywords: Localized<string[]>;
}

export const hubs: Hub[] = [
  {
    kind: 'feature',
    path: '/features',
    name: { en: 'Features', ar: 'الميزات' },
    seoTitle: {
      en: 'Features — The Complete School Operating System',
      ar: 'الميزات — نظام تشغيل المدارس المتكامل',
    },
    metaDescription: {
      en: 'Explore every Munaxa feature — attendance, admissions, academics, finance, HR, transportation, communication and more — in one school operating system.',
      ar: 'استكشف كل ميزات Munaxa — الحضور والقبول والأكاديمي والمالية والموارد البشرية والنقل والتواصل والمزيد — في نظام تشغيل مدارس واحد.',
    },
    headline: {
      en: 'Everything your school needs, in one platform',
      ar: 'كل ما تحتاجه مدرستك في منصة واحدة',
    },
    intro: {
      en: 'Munaxa unifies every school operation into a single, secure platform. Explore the modules that replace your scattered tools and spreadsheets.',
      ar: 'توحّد Munaxa كل عمليات المدرسة في منصة آمنة واحدة. استكشف الوحدات التي تستبدل أدواتك وجداولك المتفرّقة.',
    },
    keywords: {
      en: [
        'school management features',
        'school software modules',
        'school operating system features',
      ],
      ar: ['ميزات إدارة المدارس', 'وحدات برنامج المدارس'],
    },
  },
  {
    kind: 'solution',
    path: '/solutions',
    name: { en: 'Solutions', ar: 'الحلول' },
    seoTitle: {
      en: 'Solutions — School Software for Every Type of School',
      ar: 'الحلول — برمجيات مدرسية لكل نوع مدرسة',
    },
    metaDescription: {
      en: 'School management solutions tailored to private schools, international schools, K-12 and school groups across Jordan and MENA.',
      ar: 'حلول إدارة مدرسية مصمّمة للمدارس الخاصة والدولية ومدارس K-12 ومجموعات المدارس في الأردن والمنطقة.',
    },
    headline: { en: 'Solutions for every kind of school', ar: 'حلول لكل نوع من المدارس' },
    intro: {
      en: 'Whether you run a single private school, a multi-curriculum international school or a group of campuses, Munaxa adapts to how you operate.',
      ar: 'سواء كنت تدير مدرسة خاصة واحدة أو مدرسة دولية متعددة المناهج أو مجموعة فروع، تتكيّف Munaxa مع طريقة عملك.',
    },
    keywords: {
      en: ['school software solutions', 'private school solution', 'international school solution'],
      ar: ['حلول برمجيات المدارس', 'حل المدارس الخاصة'],
    },
  },
  {
    kind: 'integration',
    path: '/integrations',
    name: { en: 'Integrations', ar: 'التكاملات' },
    seoTitle: {
      en: 'Integrations — Connect Munaxa to Your School’s Tools',
      ar: 'التكاملات — اربط Munaxa بأدوات مدرستك',
    },
    metaDescription: {
      en: 'Munaxa integrates with JoFotara, Google Classroom, Microsoft Teams and more — so your school data stays connected across every tool.',
      ar: 'تتكامل Munaxa مع JoFotara وGoogle Classroom وMicrosoft Teams والمزيد، لتبقى بيانات مدرستك مترابطة عبر كل الأدوات.',
    },
    headline: {
      en: 'Connect Munaxa to the tools you already use',
      ar: 'اربط Munaxa بالأدوات التي تستخدمها',
    },
    intro: {
      en: 'From national e-invoicing to classroom collaboration, Munaxa’s integrations keep your school data in sync — no double entry.',
      ar: 'من الفوترة الوطنية إلى التعاون الصفّي، تُبقي تكاملات Munaxa بيانات مدرستك متزامنة دون إدخال مزدوج.',
    },
    keywords: {
      en: ['school software integrations', 'JoFotara integration', 'Google Classroom integration'],
      ar: ['تكاملات برامج المدارس', 'تكامل JoFotara'],
    },
  },
  {
    kind: 'comparison',
    path: '/compare',
    name: { en: 'Compare', ar: 'المقارنات' },
    seoTitle: {
      en: 'Compare — Munaxa vs Spreadsheets, Manual & Generic ERP',
      ar: 'المقارنات — Munaxa مقابل الجداول والإدارة اليدوية وERP العام',
    },
    metaDescription: {
      en: 'See how Munaxa compares to Excel, manual administration and generic ERPs — and why schools choose a purpose-built school operating system.',
      ar: 'اطّلع على مقارنة Munaxa بـ Excel والإدارة اليدوية وأنظمة ERP العامة، ولماذا تختار المدارس نظام تشغيل مدرسي مخصّص.',
    },
    headline: { en: 'How Munaxa compares', ar: 'كيف تُقارن Munaxa' },
    intro: {
      en: 'Thinking of moving on from spreadsheets, paper or a generic ERP? See the difference a purpose-built school platform makes.',
      ar: 'تفكّر في الانتقال من الجداول أو الورق أو نظام ERP عام؟ اطّلع على الفرق الذي تصنعه منصة مدرسية مخصّصة.',
    },
    keywords: {
      en: ['school software comparison', 'Munaxa vs Excel', 'school management alternatives'],
      ar: ['مقارنة برامج المدارس', 'بدائل إدارة المدارس'],
    },
  },
  {
    kind: 'article',
    path: '/blog',
    name: { en: 'Knowledge Center', ar: 'مركز المعرفة' },
    seoTitle: {
      en: 'Knowledge Center — Guides on School Operations & EdTech',
      ar: 'مركز المعرفة — أدلّة حول عمليات المدارس والتقنية التعليمية',
    },
    metaDescription: {
      en: 'Practical guides on school finance, admissions, attendance, student information systems, JoFotara and digital transformation for schools.',
      ar: 'أدلّة عملية حول مالية المدارس والقبول والحضور وأنظمة معلومات الطلاب وJoFotara والتحوّل الرقمي للمدارس.',
    },
    headline: { en: 'The Munaxa Knowledge Center', ar: 'مركز المعرفة من Munaxa' },
    intro: {
      en: 'Authoritative, practical guides for school leaders — on operations, finance, compliance and the technology that runs a modern school.',
      ar: 'أدلّة عملية موثوقة لقادة المدارس حول العمليات والمالية والامتثال والتقنية التي تدير مدرسة حديثة.',
    },
    keywords: {
      en: ['school management blog', 'school operations guides', 'edtech knowledge center'],
      ar: ['مدوّنة إدارة المدارس', 'أدلّة عمليات المدارس'],
    },
  },
];

export function findHub(path: string): Hub | undefined {
  return hubs.find((h) => h.path === path);
}
