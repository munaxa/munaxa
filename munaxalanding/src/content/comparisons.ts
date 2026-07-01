import type { ContentPage } from './types';

/** Comparison pages → /compare/[slug]. */
export const comparisons: ContentPage[] = [
  {
    kind: 'comparison',
    slug: 'excel',
    icon: 'Table2',
    name: { en: 'Munaxa vs Excel', ar: 'Munaxa مقابل Excel' },
    seoTitle: {
      en: 'Munaxa vs Excel for School Management — Why Schools Switch',
      ar: 'Munaxa مقابل Excel لإدارة المدارس — لماذا تتحوّل المدارس',
    },
    metaDescription: {
      en: 'Spreadsheets break as schools grow. See how Munaxa replaces fragile Excel files with a secure, connected school management platform.',
      ar: 'تنهار جداول البيانات مع نمو المدارس. اكتشف كيف تستبدل Munaxa ملفات Excel الهشّة بمنصة إدارة مدرسية آمنة ومترابطة.',
    },
    keywords: {
      en: ['Munaxa vs Excel', 'school management Excel alternative', 'replace spreadsheets school'],
      ar: ['Munaxa مقابل Excel', 'بديل Excel لإدارة المدارس'],
    },
    eyebrow: { en: 'Comparison', ar: 'مقارنة' },
    headline: {
      en: 'Munaxa vs Excel for running a school',
      ar: 'Munaxa مقابل Excel لإدارة المدرسة',
    },
    intro: {
      en: 'Excel is where most schools start — and where many get stuck. As students, staff and fees grow, spreadsheets become slow, error-prone and impossible to keep in sync.',
      ar: 'يبدأ معظم المدارس بـ Excel — وكثير منها يعلق فيه. مع نمو الطلاب والموظفين والرسوم، تصبح الجداول بطيئة وعرضة للأخطاء ويستحيل إبقاؤها متزامنة.',
    },
    highlights: [
      {
        icon: 'Link',
        title: { en: 'Connected, not siloed', ar: 'مترابط لا منعزل' },
        body: {
          en: 'One record updates everywhere — no copy-paste between files.',
          ar: 'سجل واحد يُحدّث في كل مكان دون نسخ بين الملفات.',
        },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Secure & permissioned', ar: 'آمن ومُصرّح' },
        body: {
          en: 'Role-based access instead of shared, editable files.',
          ar: 'صلاحيات حسب الدور بدل ملفات مشتركة قابلة للتعديل.',
        },
      },
      {
        icon: 'BellRing',
        title: { en: 'Automated, not manual', ar: 'مؤتمت لا يدوي' },
        body: {
          en: 'Invoices, alerts and reports generate themselves.',
          ar: 'الفواتير والتنبيهات والتقارير تُنشأ تلقائياً.',
        },
      },
    ],
    sections: [
      {
        heading: { en: 'Where spreadsheets fail schools', ar: 'أين تفشل الجداول مع المدارس' },
        paragraphs: {
          en: [
            'A single mistyped formula can misreport fees for an entire grade. Files get emailed, duplicated and overwritten until no one knows which version is correct.',
            'Munaxa replaces that fragility with one secure system of record, accurate by design and accessible to the right people only.',
          ],
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Can we import our existing Excel data?',
          ar: 'هل يمكن استيراد بيانات Excel الحالية؟',
        },
        answer: {
          en: 'Yes — Munaxa imports student, staff and fee data from spreadsheets during onboarding.',
          ar: 'نعم، تستورد Munaxa بيانات الطلاب والموظفين والرسوم من الجداول أثناء الإعداد.',
        },
      },
    ],
    related: {
      features: ['finance', 'reporting'],
      solutions: ['private-schools'],
      comparisons: ['manual-administration'],
    },
  },
  {
    kind: 'comparison',
    slug: 'manual-administration',
    icon: 'FileStack',
    name: { en: 'Munaxa vs Manual Administration', ar: 'Munaxa مقابل الإدارة اليدوية' },
    seoTitle: {
      en: 'Munaxa vs Manual School Administration — Go Paperless',
      ar: 'Munaxa مقابل الإدارة المدرسية اليدوية — نحو اللاورقية',
    },
    metaDescription: {
      en: 'Paper registers, files and manual processes cost schools time and accuracy. See how Munaxa digitises school administration end to end.',
      ar: 'تكلّف السجلات الورقية والملفات والعمليات اليدوية المدارس وقتاً ودقة. اكتشف كيف ترقمن Munaxa الإدارة المدرسية من البداية للنهاية.',
    },
    keywords: {
      en: ['paperless school administration', 'digitise school admin', 'manual vs digital school'],
      ar: ['إدارة مدرسية بلا ورق', 'رقمنة إدارة المدرسة'],
    },
    eyebrow: { en: 'Comparison', ar: 'مقارنة' },
    headline: {
      en: 'Munaxa vs manual school administration',
      ar: 'Munaxa مقابل الإدارة المدرسية اليدوية',
    },
    intro: {
      en: 'Manual administration — paper registers, physical files, handwritten receipts — is slow, hard to audit, and easily lost. Digitising it returns hours to every team.',
      ar: 'الإدارة اليدوية — سجلات ورقية وملفات وإيصالات بخط اليد — بطيئة وصعبة التدقيق وسهلة الضياع. رقمنتها تعيد ساعات لكل فريق.',
    },
    highlights: [
      {
        icon: 'Clock',
        title: { en: 'Hours back', ar: 'ساعات تُستعاد' },
        body: {
          en: 'Automation removes repetitive paperwork.',
          ar: 'الأتمتة تزيل الأعمال الورقية المتكررة.',
        },
      },
      {
        icon: 'Search',
        title: { en: 'Instantly searchable', ar: 'بحث فوري' },
        body: {
          en: 'Find any record in seconds, not folders.',
          ar: 'اعثر على أي سجل في ثوانٍ لا في المجلّدات.',
        },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Safe & backed up', ar: 'آمن ومنسوخ احتياطياً' },
        body: {
          en: 'No more lost or damaged files.',
          ar: 'لا مزيد من الملفات المفقودة أو التالفة.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Is it hard to move off paper?', ar: 'هل الانتقال من الورق صعب؟' },
        answer: {
          en: 'No — Munaxa’s onboarding migrates your records and trains staff so the switch is smooth.',
          ar: 'لا، يتولّى إعداد Munaxa ترحيل سجلاتك وتدريب الموظفين ليكون التحوّل سلساً.',
        },
      },
    ],
    related: {
      features: ['admissions', 'attendance'],
      comparisons: ['excel'],
      articles: ['digital-transformation-schools'],
    },
  },
  {
    kind: 'comparison',
    slug: 'generic-erp',
    icon: 'Boxes',
    name: { en: 'Munaxa vs Generic ERP', ar: 'Munaxa مقابل أنظمة ERP العامة' },
    seoTitle: {
      en: 'Munaxa vs Generic ERP for Schools — Purpose-Built Wins',
      ar: 'Munaxa مقابل أنظمة ERP العامة للمدارس — المصمّم لغرضه يفوز',
    },
    metaDescription: {
      en: 'Generic ERPs force schools to bend to software built for factories and offices. See why a purpose-built school OS like Munaxa fits better.',
      ar: 'تُجبر أنظمة ERP العامة المدارس على التكيّف مع برمجيات صُممت للمصانع والمكاتب. اكتشف لماذا يناسب نظام تشغيل مدرسي مخصّص مثل Munaxa أكثر.',
    },
    keywords: {
      en: ['school ERP vs generic ERP', 'purpose-built school software', 'education ERP'],
      ar: ['ERP المدارس مقابل ERP العام', 'برمجيات مدرسية مخصّصة'],
    },
    eyebrow: { en: 'Comparison', ar: 'مقارنة' },
    headline: { en: 'Munaxa vs a generic ERP', ar: 'Munaxa مقابل نظام ERP عام' },
    intro: {
      en: 'A generic ERP can technically store school data — but schools aren’t factories. Admissions, report cards, parent communication and fee cycles need software that already understands them.',
      ar: 'يستطيع نظام ERP عام تخزين بيانات المدرسة تقنياً — لكن المدارس ليست مصانع. يحتاج القبول وكشوف العلامات والتواصل مع الأهل ودورات الرسوم إلى برمجيات تفهمها أصلاً.',
    },
    highlights: [
      {
        icon: 'GraduationCap',
        title: { en: 'Education-native', ar: 'مصمّم للتعليم' },
        body: {
          en: 'Built around the school year, not generic workflows.',
          ar: 'مبني حول العام الدراسي لا حول مسارات عامة.',
        },
      },
      {
        icon: 'Zap',
        title: { en: 'Fast to deploy', ar: 'سريع التطبيق' },
        body: { en: 'No months of costly customisation.', ar: 'دون أشهر من التخصيص المكلف.' },
      },
      {
        icon: 'Languages',
        title: { en: 'Bilingual for MENA', ar: 'ثنائي اللغة للمنطقة' },
        body: {
          en: 'Arabic-first, unlike most global ERPs.',
          ar: 'يدعم العربية أولاً بخلاف معظم أنظمة ERP العالمية.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Why not use our company’s ERP?',
          ar: 'لماذا لا نستخدم نظام ERP الخاص بنا؟',
        },
        answer: {
          en: 'Generic ERPs lack admissions, gradebooks, report cards and parent apps — Munaxa includes them out of the box.',
          ar: 'تفتقر أنظمة ERP العامة للقبول وسجلات الدرجات وكشوف العلامات وتطبيقات الأهل — وتتضمّنها Munaxa جاهزة.',
        },
      },
    ],
    related: { solutions: ['school-groups'], features: ['academics', 'finance'] },
  },
];
