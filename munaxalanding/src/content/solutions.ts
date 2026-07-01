import type { ContentPage } from './types';

/** Solution pages → /solutions/[slug]. Audience/segment landing pages. */
export const solutions: ContentPage[] = [
  {
    kind: 'solution',
    slug: 'private-schools',
    icon: 'School',
    name: { en: 'Private Schools', ar: 'المدارس الخاصة' },
    seoTitle: {
      en: 'School Management Software for Private Schools',
      ar: 'برنامج إدارة المدارس الخاصة',
    },
    metaDescription: {
      en: 'An all-in-one school management platform for private schools — admissions, fees, academics, attendance and parent communication in one secure system.',
      ar: 'منصة متكاملة لإدارة المدارس الخاصة تجمع القبول والرسوم والشؤون الأكاديمية والحضور والتواصل مع الأهل في نظام آمن واحد.',
    },
    keywords: {
      en: [
        'private school software',
        'private school management system',
        'school management software',
      ],
      ar: ['برنامج المدارس الخاصة', 'نظام إدارة المدارس الخاصة'],
    },
    eyebrow: { en: 'Solution', ar: 'الحل' },
    headline: { en: 'The operating system for private schools', ar: 'نظام تشغيل المدارس الخاصة' },
    intro: {
      en: 'Private schools run on tuition, reputation and relationships. Munaxa unifies the operations behind all three — so your team delivers a premium experience without premium overhead.',
      ar: 'تعتمد المدارس الخاصة على الرسوم والسمعة والعلاقات. توحّد Munaxa العمليات خلفها جميعاً لتقدّم تجربة راقية دون أعباء إضافية.',
    },
    highlights: [
      {
        icon: 'Wallet',
        title: { en: 'Protect tuition revenue', ar: 'حماية إيرادات الرسوم' },
        body: {
          en: 'Automated billing and collections reduce overdue fees.',
          ar: 'فوترة وتحصيل مؤتمتان يقلّلان المتأخرات.',
        },
      },
      {
        icon: 'Sparkles',
        title: { en: 'A premium parent experience', ar: 'تجربة راقية للأهل' },
        body: {
          en: 'A polished portal and app justify your fees.',
          ar: 'بوابة وتطبيق أنيقان يبرّران الرسوم.',
        },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Secure & compliant', ar: 'آمن ومتوافق' },
        body: {
          en: 'Enterprise security with JoFotara e-invoicing in Jordan.',
          ar: 'أمان مؤسسي مع فوترة JoFotara في الأردن.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Is Munaxa suitable for a single private school?',
          ar: 'هل تناسب Munaxa مدرسة خاصة واحدة؟',
        },
        answer: {
          en: 'Yes — it scales from a single campus to large multi-school groups.',
          ar: 'نعم، تتوسّع من حرم واحد إلى مجموعات مدارس كبيرة.',
        },
      },
    ],
    related: {
      features: ['admissions', 'finance', 'parent-portal', 'attendance'],
      countries: ['jordan'],
      comparisons: ['excel'],
    },
  },
  {
    kind: 'solution',
    slug: 'international-schools',
    icon: 'Globe',
    name: { en: 'International Schools', ar: 'المدارس الدولية' },
    seoTitle: {
      en: 'School Management Software for International Schools',
      ar: 'برنامج إدارة المدارس الدولية',
    },
    metaDescription: {
      en: 'Bilingual, multi-curriculum school management for international schools — British, American and IB programmes, multi-currency fees and global-standard reporting.',
      ar: 'إدارة مدرسية بلغتين ومتعددة المناهج للمدارس الدولية — البريطانية والأمريكية والبكالوريا الدولية، مع رسوم متعددة العملات وتقارير بمعايير عالمية.',
    },
    keywords: {
      en: [
        'international school software',
        'multi-curriculum school system',
        'IB school management',
      ],
      ar: ['برنامج المدارس الدولية', 'نظام متعدد المناهج'],
    },
    eyebrow: { en: 'Solution', ar: 'الحل' },
    headline: { en: 'Built for international schools', ar: 'مصمّم للمدارس الدولية' },
    intro: {
      en: 'Run multiple curricula, languages and currencies in one platform — with the bilingual experience and global reporting international families expect.',
      ar: 'أدِر عدة مناهج ولغات وعملات في منصة واحدة، مع التجربة ثنائية اللغة والتقارير العالمية التي تتوقّعها العائلات الدولية.',
    },
    highlights: [
      {
        icon: 'BookOpen',
        title: { en: 'Multi-curriculum', ar: 'متعدد المناهج' },
        body: {
          en: 'British, American, IB and national programmes side by side.',
          ar: 'مناهج بريطانية وأمريكية وبكالوريا دولية ووطنية معاً.',
        },
      },
      {
        icon: 'Languages',
        title: { en: 'Truly bilingual', ar: 'ثنائي اللغة فعلاً' },
        body: {
          en: 'Arabic and English across every screen and report.',
          ar: 'العربية والإنجليزية في كل شاشة وتقرير.',
        },
      },
      {
        icon: 'Globe',
        title: { en: 'Multi-currency fees', ar: 'رسوم متعددة العملات' },
        body: {
          en: 'Bill families in the currency that suits them.',
          ar: 'افوتر العائلات بالعملة المناسبة لها.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Can it handle more than one curriculum?', ar: 'هل يدعم أكثر من منهج؟' },
        answer: {
          en: 'Yes — configure independent grading and reporting per curriculum.',
          ar: 'نعم، يمكن إعداد تقييم وتقارير مستقلة لكل منهج.',
        },
      },
    ],
    related: { features: ['academics', 'admissions', 'finance'], countries: ['uae', 'qatar'] },
  },
  {
    kind: 'solution',
    slug: 'k12',
    icon: 'GraduationCap',
    name: { en: 'K-12 Schools', ar: 'مدارس K-12' },
    seoTitle: {
      en: 'K-12 School Management Software & Student Information System',
      ar: 'برنامج إدارة مدارس K-12 ونظام معلومات الطلاب',
    },
    metaDescription: {
      en: 'A complete K-12 student information system and school management platform — from kindergarten to grade 12, across every department.',
      ar: 'نظام معلومات طلاب ومنصة إدارة مدرسية متكاملة لمراحل K-12 من الروضة حتى الصف الثاني عشر وعبر جميع الأقسام.',
    },
    keywords: {
      en: ['k12 school software', 'student information system', 'k-12 management platform'],
      ar: ['برنامج مدارس K-12', 'نظام معلومات الطلاب'],
    },
    eyebrow: { en: 'Solution', ar: 'الحل' },
    headline: {
      en: 'One platform from KG to grade 12',
      ar: 'منصة واحدة من الروضة إلى الصف الثاني عشر',
    },
    intro: {
      en: 'Manage every stage of the K-12 journey — early years through graduation — in one student information system, with the structure each phase needs.',
      ar: 'أدِر كل مرحلة في رحلة K-12 من السنوات المبكرة حتى التخرّج في نظام معلومات طلاب واحد، بالبنية التي تحتاجها كل مرحلة.',
    },
    highlights: [
      {
        icon: 'Layers',
        title: { en: 'Every stage covered', ar: 'كل المراحل مغطّاة' },
        body: {
          en: 'Early years, primary, middle and high school in one system.',
          ar: 'السنوات المبكرة والابتدائي والإعدادي والثانوي في نظام واحد.',
        },
      },
      {
        icon: 'Database',
        title: { en: 'A single student record', ar: 'سجل طالب موحّد' },
        body: {
          en: 'One profile follows each child across years and stages.',
          ar: 'ملف واحد يرافق كل طالب عبر السنوات والمراحل.',
        },
      },
      {
        icon: 'BarChart3',
        title: { en: 'Whole-school analytics', ar: 'تحليلات للمدرسة كاملة' },
        body: {
          en: 'Leadership dashboards across academics, finance and attendance.',
          ar: 'لوحات قيادة عبر الأكاديمي والمالي والحضور.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'What is a student information system?', ar: 'ما هو نظام معلومات الطلاب؟' },
        answer: {
          en: 'A central database of every student’s academic, attendance and contact records — the backbone of school operations.',
          ar: 'قاعدة بيانات مركزية لسجلات كل طالب الأكاديمية والحضور والتواصل، وهي العمود الفقري لعمليات المدرسة.',
        },
      },
    ],
    related: { features: ['academics', 'attendance', 'reporting'], articles: ['what-is-sis'] },
  },
  {
    kind: 'solution',
    slug: 'school-groups',
    icon: 'Building2',
    name: { en: 'School Groups', ar: 'مجموعات المدارس' },
    seoTitle: {
      en: 'Multi-School Management Software for School Groups & Chains',
      ar: 'برنامج إدارة متعدد المدارس لمجموعات وسلاسل المدارس',
    },
    metaDescription: {
      en: 'Manage multiple campuses from one platform with consolidated reporting, shared standards and per-school autonomy. Built for school groups and chains.',
      ar: 'أدِر عدة فروع من منصة واحدة مع تقارير موحّدة ومعايير مشتركة واستقلالية لكل مدرسة، مصمّم لمجموعات وسلاسل المدارس.',
    },
    keywords: {
      en: ['multi-school software', 'school group management', 'school chain software'],
      ar: ['برنامج متعدد المدارس', 'إدارة مجموعات المدارس'],
    },
    eyebrow: { en: 'Solution', ar: 'الحل' },
    headline: {
      en: 'Run an entire school group from one platform',
      ar: 'أدِر مجموعة مدارس كاملة من منصة واحدة',
    },
    intro: {
      en: 'Give each campus autonomy while leadership gets consolidated visibility, shared policies and group-wide benchmarking — without duplicating systems.',
      ar: 'امنح كل فرع استقلاليته بينما تحصل القيادة على رؤية موحّدة وسياسات مشتركة ومقارنات على مستوى المجموعة دون تكرار الأنظمة.',
    },
    highlights: [
      {
        icon: 'Building2',
        title: { en: 'Multi-campus', ar: 'متعدد الفروع' },
        body: {
          en: 'Unlimited schools under one secure tenant.',
          ar: 'عدد غير محدود من المدارس ضمن مستأجر آمن واحد.',
        },
      },
      {
        icon: 'BarChart3',
        title: { en: 'Consolidated reporting', ar: 'تقارير موحّدة' },
        body: {
          en: 'Compare performance and finance across campuses.',
          ar: 'قارن الأداء والمالية عبر الفروع.',
        },
      },
      {
        icon: 'Settings',
        title: { en: 'Shared standards', ar: 'معايير مشتركة' },
        body: {
          en: 'Roll out policies and templates group-wide.',
          ar: 'طبّق السياسات والقوالب على مستوى المجموعة.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Can each school keep its own branding?', ar: 'هل يحتفظ كل فرع بهويته؟' },
        answer: {
          en: 'Yes — each campus has its own branding and settings under the group umbrella.',
          ar: 'نعم، لكل فرع هويته وإعداداته تحت مظلة المجموعة.',
        },
      },
    ],
    related: { features: ['hr', 'finance', 'reporting'], solutions: ['private-schools'] },
  },
];
