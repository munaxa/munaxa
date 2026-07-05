import type { ContentPage } from './types';

/** ISO 3166-1 alpha-2 codes for LocalBusiness structured data, keyed by country slug. */
export const COUNTRY_ISO: Record<string, string> = {
  jordan: 'JO',
  'saudi-arabia': 'SA',
  uae: 'AE',
  qatar: 'QA',
  oman: 'OM',
  bahrain: 'BH',
  egypt: 'EG',
};

/** Country pages → /[country]. Geo-targeted landing pages with LocalBusiness schema. */
export const countries: ContentPage[] = [
  {
    kind: 'country',
    slug: 'jordan',
    icon: 'MapPin',
    name: { en: 'Jordan', ar: 'الأردن' },
    seoTitle: {
      en: 'School Management Software in Jordan — Munaxa',
      ar: 'برنامج إدارة المدارس في الأردن',
    },
    metaDescription: {
      en: 'Munaxa is the school management software built for Jordan — Arabic-first, JoFotara e-invoicing compliant, and trusted by private schools from Amman to Irbid.',
      ar: 'Munaxa هو برنامج إدارة المدارس المصمّم للأردن — يدعم العربية أولاً ومتوافق مع الفوترة الإلكترونية JoFotara وموثوق من المدارس الخاصة من عمّان إلى إربد.',
    },
    keywords: {
      en: [
        'school management software Jordan',
        'school ERP Jordan',
        'JoFotara school',
        'private school software Amman',
      ],
      ar: ['برنامج إدارة المدارس الأردن', 'نظام إدارة المدارس في الأردن', 'JoFotara مدارس'],
    },
    eyebrow: { en: 'Jordan', ar: 'الأردن' },
    headline: {
      en: 'School management software built for Jordan',
      ar: 'برنامج إدارة مدارس مصمّم للأردن',
    },
    intro: {
      en: 'Munaxa is designed for Jordanian private schools — Arabic-first, fully compliant with JoFotara national e-invoicing, and tuned to the local academic calendar and ministry reporting.',
      ar: 'صُمّمت Munaxa للمدارس الخاصة الأردنية — تدعم العربية أولاً، ومتوافقة بالكامل مع الفوترة الوطنية JoFotara، ومهيّأة للتقويم الأكاديمي المحلي وتقارير الوزارة.',
    },
    highlights: [
      {
        icon: 'ShieldCheck',
        title: { en: 'JoFotara compliant', ar: 'متوافق مع JoFotara' },
        body: {
          en: 'Native support for Jordan’s national e-invoicing mandate.',
          ar: 'دعم أصيل لإلزام الفوترة الوطنية في الأردن.',
        },
      },
      {
        icon: 'Languages',
        title: { en: 'Arabic-first', ar: 'العربية أولاً' },
        body: {
          en: 'Full RTL Arabic experience for staff and parents.',
          ar: 'تجربة عربية كاملة من اليمين لليسار للموظفين والأهل.',
        },
      },
      {
        icon: 'MapPin',
        title: { en: 'Local & nearby', ar: 'محلي وقريب' },
        body: {
          en: 'Support that understands Jordanian schools and regulations.',
          ar: 'دعم يفهم المدارس الأردنية وأنظمتها.',
        },
      },
    ],
    sections: [
      {
        heading: {
          en: 'Why Jordanian schools choose Munaxa',
          ar: 'لماذا تختار المدارس الأردنية Munaxa',
        },
        paragraphs: {
          en: [
            'Jordan’s private schools face rising parent expectations and new compliance demands like JoFotara e-invoicing. Generic software rarely fits both.',
            'Munaxa was built for this market: Arabic-first, locally compliant, and complete — from admissions and fees to attendance and parent communication.',
          ],
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Does Munaxa support JoFotara in Jordan?',
          ar: 'هل تدعم Munaxa نظام JoFotara في الأردن؟',
        },
        answer: {
          en: 'Yes — Munaxa natively supports Jordan’s JoFotara national e-invoicing for school fees.',
          ar: 'نعم، تدعم Munaxa نظام الفوترة الوطني JoFotara لرسوم المدارس في الأردن بشكل أصيل.',
        },
      },
      {
        question: { en: 'Is the platform available in Arabic?', ar: 'هل المنصة متوفّرة بالعربية؟' },
        answer: {
          en: 'Yes — Munaxa is fully bilingual with a complete right-to-left Arabic interface.',
          ar: 'نعم، Munaxa ثنائية اللغة بالكامل مع واجهة عربية كاملة من اليمين لليسار.',
        },
      },
    ],
    related: {
      features: ['finance', 'jofotara', 'admissions'],
      solutions: ['private-schools'],
      integrations: ['jofotara'],
    },
  },
  {
    kind: 'country',
    slug: 'saudi-arabia',
    icon: 'MapPin',
    name: { en: 'Saudi Arabia', ar: 'السعودية' },
    seoTitle: {
      en: 'School Management Software in Saudi Arabia — Munaxa',
      ar: 'برنامج إدارة المدارس في السعودية',
    },
    metaDescription: {
      en: 'Arabic-first school management software for private and international schools in Saudi Arabia — admissions, fees, academics and communication in one platform.',
      ar: 'برنامج إدارة مدارس يدعم العربية أولاً للمدارس الخاصة والدولية في السعودية — القبول والرسوم والأكاديمي والتواصل مع الأهل في منصة واحدة.',
    },
    keywords: {
      en: [
        'school management software Saudi Arabia',
        'school ERP Saudi',
        'private school software KSA',
      ],
      ar: ['برنامج إدارة المدارس السعودية', 'نظام إدارة المدارس في السعودية'],
    },
    eyebrow: { en: 'Saudi Arabia', ar: 'السعودية' },
    headline: {
      en: 'School management software for Saudi Arabia',
      ar: 'برنامج إدارة مدارس للسعودية',
    },
    intro: {
      en: 'A bilingual, enterprise school platform for Saudi private and international schools — aligned with Vision 2030’s push for digital education.',
      ar: 'منصة مدرسية مؤسسية ثنائية اللغة للمدارس الخاصة والدولية في السعودية، متوائمة مع توجّه رؤية 2030 نحو التعليم الرقمي.',
    },
    highlights: [
      {
        icon: 'Languages',
        title: { en: 'Arabic-first', ar: 'العربية أولاً' },
        body: {
          en: 'Complete RTL Arabic for staff and families.',
          ar: 'عربية كاملة من اليمين لليسار للموظفين والعائلات.',
        },
      },
      {
        icon: 'Building2',
        title: { en: 'Scales to groups', ar: 'يتوسّع للمجموعات' },
        body: {
          en: 'From one school to nationwide chains.',
          ar: 'من مدرسة واحدة إلى سلاسل على مستوى المملكة.',
        },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Enterprise security', ar: 'أمان مؤسسي' },
        body: {
          en: 'Multi-tenant security and data residency options.',
          ar: 'أمان متعدد المستأجرين وخيارات استضافة البيانات.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Is Munaxa available in Arabic for Saudi schools?',
          ar: 'هل تتوفّر Munaxa بالعربية للمدارس السعودية؟',
        },
        answer: {
          en: 'Yes — Munaxa is fully bilingual with a complete Arabic, right-to-left interface.',
          ar: 'نعم، Munaxa ثنائية اللغة بالكامل بواجهة عربية من اليمين لليسار.',
        },
      },
    ],
    related: {
      features: ['finance', 'admissions', 'academics'],
      solutions: ['international-schools', 'school-groups'],
    },
  },
  {
    kind: 'country',
    slug: 'uae',
    icon: 'MapPin',
    name: { en: 'UAE', ar: 'الإمارات' },
    seoTitle: {
      en: 'School Management Software in the UAE — Munaxa',
      ar: 'برنامج إدارة المدارس في الإمارات',
    },
    metaDescription: {
      en: 'School management software for the UAE’s private and international schools — multi-curriculum, multi-currency, bilingual, and ready for KHDA/ADEK expectations.',
      ar: 'برنامج إدارة مدارس للمدارس الخاصة والدولية في الإمارات — متعدد المناهج والعملات، ثنائي اللغة، ومهيّأ لمتطلبات KHDA/ADEK.',
    },
    keywords: {
      en: [
        'school management software UAE',
        'school software Dubai',
        'KHDA school system',
        'international school software UAE',
      ],
      ar: ['برنامج إدارة المدارس الإمارات', 'نظام إدارة المدارس دبي'],
    },
    eyebrow: { en: 'UAE', ar: 'الإمارات' },
    headline: { en: 'School management software for the UAE', ar: 'برنامج إدارة مدارس للإمارات' },
    intro: {
      en: 'Built for the UAE’s diverse, multi-curriculum schools — multi-currency fees, bilingual experience, and the reporting depth regulators and groups expect.',
      ar: 'مصمّم لمدارس الإمارات المتنوّعة ومتعددة المناهج — رسوم متعددة العملات وتجربة ثنائية اللغة وعمق التقارير الذي تتوقّعه الجهات والمجموعات.',
    },
    highlights: [
      {
        icon: 'BookOpen',
        title: { en: 'Multi-curriculum', ar: 'متعدد المناهج' },
        body: {
          en: 'British, American, IB and MoE together.',
          ar: 'بريطاني وأمريكي وبكالوريا دولية ووزارة معاً.',
        },
      },
      {
        icon: 'Globe',
        title: { en: 'Multi-currency', ar: 'متعدد العملات' },
        body: {
          en: 'Bill diverse families in their currency.',
          ar: 'افوتر العائلات المتنوّعة بعملاتها.',
        },
      },
      {
        icon: 'Languages',
        title: { en: 'Bilingual', ar: 'ثنائي اللغة' },
        body: { en: 'Arabic and English everywhere.', ar: 'العربية والإنجليزية في كل مكان.' },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Does Munaxa suit international schools in Dubai and Abu Dhabi?',
          ar: 'هل تناسب Munaxa المدارس الدولية في دبي وأبوظبي؟',
        },
        answer: {
          en: 'Yes — it supports multiple curricula and currencies in one platform.',
          ar: 'نعم، تدعم عدة مناهج وعملات في منصة واحدة.',
        },
      },
    ],
    related: {
      features: ['academics', 'finance', 'transportation'],
      solutions: ['international-schools'],
    },
  },
  {
    kind: 'country',
    slug: 'qatar',
    icon: 'MapPin',
    name: { en: 'Qatar', ar: 'قطر' },
    seoTitle: {
      en: 'School Management Software in Qatar — Munaxa',
      ar: 'برنامج إدارة المدارس في قطر',
    },
    metaDescription: {
      en: 'Bilingual school management software for private and international schools in Qatar — admissions, finance, academics and parent communication unified.',
      ar: 'برنامج إدارة مدارس ثنائي اللغة للمدارس الخاصة والدولية في قطر — يوحّد القبول والمالية والأكاديمي والتواصل مع الأهل.',
    },
    keywords: {
      en: ['school management software Qatar', 'school ERP Qatar', 'private school software Doha'],
      ar: ['برنامج إدارة المدارس قطر', 'نظام إدارة المدارس في قطر'],
    },
    eyebrow: { en: 'Qatar', ar: 'قطر' },
    headline: { en: 'School management software for Qatar', ar: 'برنامج إدارة مدارس لقطر' },
    intro: {
      en: 'A complete, bilingual platform for Qatar’s private and international schools — from admissions to graduation, in Arabic and English.',
      ar: 'منصة متكاملة ثنائية اللغة لمدارس قطر الخاصة والدولية — من القبول حتى التخرّج، بالعربية والإنجليزية.',
    },
    highlights: [
      {
        icon: 'Languages',
        title: { en: 'Arabic & English', ar: 'العربية والإنجليزية' },
        body: { en: 'Full bilingual experience.', ar: 'تجربة ثنائية اللغة كاملة.' },
      },
      {
        icon: 'Sparkles',
        title: { en: 'Premium experience', ar: 'تجربة راقية' },
        body: { en: 'A polished portal families notice.', ar: 'بوابة أنيقة تلاحظها العائلات.' },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Secure', ar: 'آمن' },
        body: { en: 'Enterprise-grade data protection.', ar: 'حماية بيانات بمستوى مؤسسي.' },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Is Munaxa suitable for schools in Doha?',
          ar: 'هل تناسب Munaxa مدارس الدوحة؟',
        },
        answer: {
          en: 'Yes — Munaxa serves private and international schools across Qatar.',
          ar: 'نعم، تخدم Munaxa المدارس الخاصة والدولية في جميع أنحاء قطر.',
        },
      },
    ],
    related: { features: ['admissions', 'finance'], solutions: ['international-schools'] },
  },
  {
    kind: 'country',
    slug: 'oman',
    icon: 'MapPin',
    name: { en: 'Oman', ar: 'عُمان' },
    seoTitle: {
      en: 'School Management Software in Oman — Munaxa',
      ar: 'برنامج إدارة المدارس في عُمان',
    },
    metaDescription: {
      en: 'Arabic-first school management software for private and international schools in Oman — one secure platform for admissions, fees, academics and communication.',
      ar: 'برنامج إدارة مدارس يدعم العربية أولاً للمدارس الخاصة والدولية في عُمان — منصة آمنة واحدة للقبول والرسوم والأكاديمي والتواصل.',
    },
    keywords: {
      en: ['school management software Oman', 'school ERP Oman', 'private school software Muscat'],
      ar: ['برنامج إدارة المدارس عمان', 'نظام إدارة المدارس في عمان'],
    },
    eyebrow: { en: 'Oman', ar: 'عُمان' },
    headline: { en: 'School management software for Oman', ar: 'برنامج إدارة مدارس لعُمان' },
    intro: {
      en: 'A bilingual, all-in-one school platform for Oman’s private and international schools — modern, secure and Arabic-first.',
      ar: 'منصة مدرسية متكاملة ثنائية اللغة لمدارس عُمان الخاصة والدولية — حديثة وآمنة وتدعم العربية أولاً.',
    },
    highlights: [
      {
        icon: 'Languages',
        title: { en: 'Arabic-first', ar: 'العربية أولاً' },
        body: { en: 'Complete Arabic RTL experience.', ar: 'تجربة عربية كاملة من اليمين لليسار.' },
      },
      {
        icon: 'LayoutGrid',
        title: { en: 'All-in-one', ar: 'متكامل' },
        body: { en: 'Every department in one system.', ar: 'كل الأقسام في نظام واحد.' },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Secure', ar: 'آمن' },
        body: { en: 'Enterprise-grade security.', ar: 'أمان بمستوى مؤسسي.' },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Does Munaxa support schools in Muscat?',
          ar: 'هل تدعم Munaxa مدارس مسقط؟',
        },
        answer: {
          en: 'Yes — Munaxa serves schools across Oman, including Muscat.',
          ar: 'نعم، تخدم Munaxa المدارس في جميع أنحاء عُمان بما فيها مسقط.',
        },
      },
    ],
    related: { features: ['finance', 'academics'], solutions: ['private-schools'] },
  },
  {
    kind: 'country',
    slug: 'bahrain',
    icon: 'MapPin',
    name: { en: 'Bahrain', ar: 'البحرين' },
    seoTitle: {
      en: 'School Management Software in Bahrain — Munaxa',
      ar: 'برنامج إدارة المدارس في البحرين',
    },
    metaDescription: {
      en: 'Bilingual school management software for private and international schools in Bahrain — unify admissions, finance, academics and parent communication.',
      ar: 'برنامج إدارة مدارس ثنائي اللغة للمدارس الخاصة والدولية في البحرين — وحّد القبول والمالية والأكاديمي والتواصل مع الأهل.',
    },
    keywords: {
      en: [
        'school management software Bahrain',
        'school ERP Bahrain',
        'private school software Manama',
      ],
      ar: ['برنامج إدارة المدارس البحرين', 'نظام إدارة المدارس في البحرين'],
    },
    eyebrow: { en: 'Bahrain', ar: 'البحرين' },
    headline: { en: 'School management software for Bahrain', ar: 'برنامج إدارة مدارس للبحرين' },
    intro: {
      en: 'A complete, bilingual platform for Bahrain’s schools — bringing admissions, finance, academics and communication into one secure system.',
      ar: 'منصة متكاملة ثنائية اللغة لمدارس البحرين — تجمع القبول والمالية والأكاديمي والتواصل في نظام آمن واحد.',
    },
    highlights: [
      {
        icon: 'Languages',
        title: { en: 'Bilingual', ar: 'ثنائي اللغة' },
        body: { en: 'Arabic and English throughout.', ar: 'العربية والإنجليزية في كل مكان.' },
      },
      {
        icon: 'Wallet',
        title: { en: 'Fees & finance', ar: 'الرسوم والمالية' },
        body: { en: 'Automated billing and collections.', ar: 'فوترة وتحصيل مؤتمتان.' },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Secure', ar: 'آمن' },
        body: { en: 'Enterprise data protection.', ar: 'حماية بيانات مؤسسية.' },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Is Munaxa available for schools in Manama?',
          ar: 'هل تتوفّر Munaxa لمدارس المنامة؟',
        },
        answer: {
          en: 'Yes — Munaxa serves private and international schools across Bahrain.',
          ar: 'نعم، تخدم Munaxa المدارس الخاصة والدولية في جميع أنحاء البحرين.',
        },
      },
    ],
    related: { features: ['finance', 'admissions'], solutions: ['private-schools'] },
  },
  {
    kind: 'country',
    slug: 'egypt',
    icon: 'MapPin',
    name: { en: 'Egypt', ar: 'مصر' },
    seoTitle: {
      en: 'School Management Software in Egypt — Munaxa',
      ar: 'برنامج إدارة المدارس في مصر',
    },
    metaDescription: {
      en: 'Arabic-first, scalable school management software for Egypt’s private and international schools — admissions, fees, academics and communication in one platform.',
      ar: 'برنامج إدارة مدارس يدعم العربية أولاً وقابل للتوسّع للمدارس الخاصة والدولية في مصر — القبول والرسوم والأكاديمي والتواصل في منصة واحدة.',
    },
    keywords: {
      en: ['school management software Egypt', 'school ERP Egypt', 'private school software Cairo'],
      ar: ['برنامج إدارة المدارس مصر', 'نظام إدارة المدارس في مصر'],
    },
    eyebrow: { en: 'Egypt', ar: 'مصر' },
    headline: { en: 'School management software for Egypt', ar: 'برنامج إدارة مدارس لمصر' },
    intro: {
      en: 'A scalable, bilingual platform for Egypt’s growing private and international school sector — built to handle large student populations with ease.',
      ar: 'منصة قابلة للتوسّع وثنائية اللغة لقطاع المدارس الخاصة والدولية المتنامي في مصر — مصمّمة للتعامل مع أعداد طلاب كبيرة بسهولة.',
    },
    highlights: [
      {
        icon: 'Users',
        title: { en: 'Scales to thousands', ar: 'يتوسّع لآلاف الطلاب' },
        body: { en: 'Built for large student populations.', ar: 'مصمّم لأعداد طلاب كبيرة.' },
      },
      {
        icon: 'Languages',
        title: { en: 'Arabic-first', ar: 'العربية أولاً' },
        body: { en: 'Complete Arabic experience.', ar: 'تجربة عربية كاملة.' },
      },
      {
        icon: 'Wallet',
        title: { en: 'Fee collection', ar: 'تحصيل الرسوم' },
        body: { en: 'Automated invoicing and reminders.', ar: 'فوترة وتذكيرات مؤتمتة.' },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Can Munaxa handle large schools in Cairo?',
          ar: 'هل تتعامل Munaxa مع المدارس الكبيرة في القاهرة؟',
        },
        answer: {
          en: 'Yes — Munaxa scales to schools with thousands of students.',
          ar: 'نعم، تتوسّع Munaxa لمدارس تضم آلاف الطلاب.',
        },
      },
    ],
    related: {
      features: ['finance', 'admissions', 'academics'],
      solutions: ['private-schools', 'school-groups'],
    },
  },
];

/** City pages → /[country]/[city]. */
export const cities: ContentPage[] = [
  {
    kind: 'city',
    slug: 'amman',
    parent: 'jordan',
    icon: 'MapPin',
    name: { en: 'Amman', ar: 'عمّان' },
    seoTitle: {
      en: 'School Management Software in Amman, Jordan — Munaxa',
      ar: 'برنامج إدارة المدارس في عمّان، الأردن',
    },
    metaDescription: {
      en: 'School management software for private schools in Amman — Arabic-first, JoFotara-compliant, and built for the capital’s leading schools.',
      ar: 'برنامج إدارة المدارس للمدارس الخاصة في عمّان — يدعم العربية أولاً ومتوافق مع JoFotara ومصمّم لمدارس العاصمة الرائدة.',
    },
    keywords: {
      en: ['school management software Amman', 'private school software Amman', 'school ERP Amman'],
      ar: ['برنامج إدارة المدارس عمان', 'نظام إدارة المدارس في عمّان'],
    },
    eyebrow: { en: 'Amman, Jordan', ar: 'عمّان، الأردن' },
    headline: { en: 'School management software in Amman', ar: 'برنامج إدارة المدارس في عمّان' },
    intro: {
      en: 'From Abdoun to Khalda, Amman’s private schools run on Munaxa — Arabic-first, JoFotara-compliant, and complete from admissions to graduation.',
      ar: 'من عبدون إلى خلدا، تدير مدارس عمّان الخاصة أعمالها مع Munaxa — تدعم العربية أولاً ومتوافقة مع JoFotara ومتكاملة من القبول حتى التخرّج.',
    },
    highlights: [
      {
        icon: 'ShieldCheck',
        title: { en: 'JoFotara ready', ar: 'جاهز لـ JoFotara' },
        body: {
          en: 'Compliant e-invoicing for Amman schools.',
          ar: 'فوترة إلكترونية متوافقة لمدارس عمّان.',
        },
      },
      {
        icon: 'Languages',
        title: { en: 'Arabic-first', ar: 'العربية أولاً' },
        body: { en: 'Full Arabic experience.', ar: 'تجربة عربية كاملة.' },
      },
      {
        icon: 'Sparkles',
        title: { en: 'Premium', ar: 'راقٍ' },
        body: {
          en: 'An experience parents expect in the capital.',
          ar: 'تجربة يتوقّعها الأهل في العاصمة.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Do you support private schools in Amman?',
          ar: 'هل تدعمون المدارس الخاصة في عمّان؟',
        },
        answer: {
          en: 'Yes — Munaxa is used by private schools across Amman and Jordan.',
          ar: 'نعم، تُستخدم Munaxa في المدارس الخاصة في عمّان والأردن.',
        },
      },
    ],
    related: {
      countries: ['jordan'],
      features: ['finance', 'jofotara'],
      solutions: ['private-schools'],
    },
  },
  {
    kind: 'city',
    slug: 'irbid',
    parent: 'jordan',
    icon: 'MapPin',
    name: { en: 'Irbid', ar: 'إربد' },
    seoTitle: {
      en: 'School Management Software in Irbid, Jordan — Munaxa',
      ar: 'برنامج إدارة المدارس في إربد، الأردن',
    },
    metaDescription: {
      en: 'School management software for private schools in Irbid — Arabic-first and JoFotara-compliant, with everything from admissions to fees in one platform.',
      ar: 'برنامج إدارة المدارس للمدارس الخاصة في إربد — يدعم العربية أولاً ومتوافق مع JoFotara، ويجمع كل شيء من القبول إلى الرسوم في منصة واحدة.',
    },
    keywords: {
      en: ['school management software Irbid', 'private school software Irbid'],
      ar: ['برنامج إدارة المدارس إربد', 'نظام إدارة المدارس في إربد'],
    },
    eyebrow: { en: 'Irbid, Jordan', ar: 'إربد، الأردن' },
    headline: { en: 'School management software in Irbid', ar: 'برنامج إدارة المدارس في إربد' },
    intro: {
      en: 'Irbid’s private schools use Munaxa to digitise admissions, fees, attendance and parent communication — Arabic-first and JoFotara-compliant.',
      ar: 'تستخدم مدارس إربد الخاصة Munaxa لرقمنة القبول والرسوم والحضور والتواصل مع الأهل — تدعم العربية أولاً ومتوافقة مع JoFotara.',
    },
    highlights: [
      {
        icon: 'ShieldCheck',
        title: { en: 'JoFotara ready', ar: 'جاهز لـ JoFotara' },
        body: { en: 'Compliant e-invoicing.', ar: 'فوترة إلكترونية متوافقة.' },
      },
      {
        icon: 'Languages',
        title: { en: 'Arabic-first', ar: 'العربية أولاً' },
        body: { en: 'Full Arabic experience.', ar: 'تجربة عربية كاملة.' },
      },
      {
        icon: 'LayoutGrid',
        title: { en: 'All-in-one', ar: 'متكامل' },
        body: { en: 'Every department, one platform.', ar: 'كل الأقسام في منصة واحدة.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Is Munaxa available in Irbid?', ar: 'هل تتوفّر Munaxa في إربد؟' },
        answer: {
          en: 'Yes — Munaxa serves private schools in Irbid and across northern Jordan.',
          ar: 'نعم، تخدم Munaxa المدارس الخاصة في إربد وشمال الأردن.',
        },
      },
    ],
    related: { countries: ['jordan'], features: ['finance', 'admissions'] },
  },
];
