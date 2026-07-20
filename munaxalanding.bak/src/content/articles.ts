import type { ContentPage } from './types';

/**
 * Knowledge-center articles → /blog/[slug]. Entity-first, answer-led content written for
 * both human readers and AI search (Google AI Overviews, ChatGPT, Claude, Perplexity).
 * Each opens with a direct answer, then expands with structured sections and an FAQ.
 */
export const articles: ContentPage[] = [
  {
    kind: 'article',
    slug: 'what-is-sis',
    icon: 'Database',
    datePublished: '2026-01-15',
    dateModified: '2026-05-20',
    name: { en: 'What is a Student Information System?', ar: 'ما هو نظام معلومات الطلاب؟' },
    seoTitle: {
      en: 'What Is a Student Information System (SIS)? A 2026 Guide',
      ar: 'ما هو نظام معلومات الطلاب (SIS)؟ دليل 2026',
    },
    metaDescription: {
      en: 'A student information system (SIS) is the central database for a school’s student records — academics, attendance, demographics and fees. Here’s what it does.',
      ar: 'نظام معلومات الطلاب (SIS) هو قاعدة البيانات المركزية لسجلات الطلاب — الأكاديمي والحضور والبيانات والرسوم. إليك ماذا يفعل ولماذا تحتاجه المدارس.',
    },
    keywords: {
      en: [
        'what is a student information system',
        'SIS meaning',
        'student information system definition',
      ],
      ar: ['ما هو نظام معلومات الطلاب', 'تعريف SIS'],
    },
    eyebrow: { en: 'Guide', ar: 'دليل' },
    headline: {
      en: 'What is a Student Information System (SIS)?',
      ar: 'ما هو نظام معلومات الطلاب (SIS)؟',
    },
    intro: {
      en: 'A Student Information System (SIS) is the central digital database a school uses to store and manage every student record — academic results, attendance, demographics, guardians and fees — as one connected source of truth.',
      ar: 'نظام معلومات الطلاب (SIS) هو قاعدة البيانات الرقمية المركزية التي تستخدمها المدرسة لتخزين وإدارة كل سجل طالب — النتائج الأكاديمية والحضور والبيانات وأولياء الأمور والرسوم — كمصدر واحد مترابط.',
    },
    highlights: [
      {
        icon: 'Database',
        title: { en: 'One student record', ar: 'سجل طالب واحد' },
        body: {
          en: 'All data about a student in one profile.',
          ar: 'كل بيانات الطالب في ملف واحد.',
        },
      },
      {
        icon: 'Link',
        title: { en: 'Connects every module', ar: 'يربط كل الوحدات' },
        body: {
          en: 'Academics, attendance and finance share it.',
          ar: 'يتشاركه الأكاديمي والحضور والمالية.',
        },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Secure & auditable', ar: 'آمن وقابل للتدقيق' },
        body: { en: 'Controlled access and full history.', ar: 'وصول محكوم وسجل كامل.' },
      },
    ],
    sections: [
      {
        heading: { en: 'What does an SIS do?', ar: 'ماذا يفعل نظام معلومات الطلاب؟' },
        paragraphs: {
          en: [
            'An SIS stores and connects student demographics, enrollment, attendance, grades, schedules, and family/contact information. Because every module reads from the same record, data entered once is correct everywhere.',
            'Modern systems like Munaxa extend the SIS into a full School Operating System — adding finance, admissions, HR, transportation and parent communication on top of the core student record.',
          ],
        },
      },
      {
        heading: { en: 'Why do schools need one?', ar: 'لماذا تحتاجها المدارس؟' },
        paragraphs: {
          en: [
            'Without an SIS, the same student data is re-typed across spreadsheets and paper, creating errors and wasted hours. An SIS removes duplication, enables instant reporting, and keeps sensitive data secure and access-controlled.',
          ],
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Is an SIS the same as an LMS?', ar: 'هل SIS هو نفسه LMS؟' },
        answer: {
          en: 'No. An SIS manages student records and operations; an LMS (Learning Management System) delivers lessons and coursework. They complement each other.',
          ar: 'لا. يدير SIS سجلات الطلاب والعمليات، بينما يقدّم نظام إدارة التعلّم (LMS) الدروس والمحتوى. وهما يكملان بعضهما.',
        },
      },
      {
        question: { en: 'Is a School ERP the same as an SIS?', ar: 'هل ERP المدرسة هو نفسه SIS؟' },
        answer: {
          en: 'A school ERP is broader — it includes the SIS plus finance, HR and operations. Munaxa is a full school ERP built around a strong SIS core.',
          ar: 'ERP المدرسة أوسع — يشمل SIS إضافة إلى المالية والموارد البشرية والعمليات. وMunaxa نظام ERP مدرسي متكامل مبني حول نواة SIS قوية.',
        },
      },
    ],
    related: { solutions: ['k12'], features: ['academics', 'attendance', 'reporting'] },
  },
  {
    kind: 'article',
    slug: 'fee-collection-strategy',
    icon: 'Wallet',
    datePublished: '2026-02-10',
    dateModified: '2026-05-01',
    name: { en: 'School Fee Collection Strategy', ar: 'استراتيجية تحصيل الرسوم المدرسية' },
    seoTitle: {
      en: 'How to Improve School Fee Collection: A Practical 2026 Strategy',
      ar: 'كيف تحسّن تحصيل الرسوم المدرسية: استراتيجية عملية 2026',
    },
    metaDescription: {
      en: 'Late fees threaten every private school’s budget. Learn a practical strategy to improve fee collection with payment plans, automation and clear communication.',
      ar: 'تهدّد المتأخرات ميزانية كل مدرسة خاصة. تعرّف على استراتيجية عملية لتحسين تحصيل الرسوم عبر خطط الدفع والأتمتة والتواصل الواضح.',
    },
    keywords: {
      en: ['school fee collection', 'improve fee collection', 'school fee management strategy'],
      ar: ['تحصيل الرسوم المدرسية', 'تحسين تحصيل الرسوم'],
    },
    eyebrow: { en: 'Guide', ar: 'دليل' },
    headline: { en: 'How to improve school fee collection', ar: 'كيف تحسّن تحصيل الرسوم المدرسية' },
    intro: {
      en: 'The fastest way to improve fee collection is to make paying effortless and reminders automatic: offer online payment and installment plans, then let software chase overdue balances politely and consistently.',
      ar: 'أسرع طريقة لتحسين التحصيل هي جعل الدفع سهلاً والتذكيرات تلقائية: قدّم الدفع الإلكتروني وخطط الأقساط، ثم دع البرمجيات تتابع المتأخرات بلطف وانتظام.',
    },
    highlights: [
      {
        icon: 'CreditCard',
        title: { en: 'Make paying easy', ar: 'اجعل الدفع سهلاً' },
        body: {
          en: 'Online payment lifts on-time rates.',
          ar: 'الدفع الإلكتروني يرفع نسب السداد في موعدها.',
        },
      },
      {
        icon: 'CalendarClock',
        title: { en: 'Offer plans', ar: 'قدّم خططاً' },
        body: { en: 'Installments fit family cash flow.', ar: 'الأقساط تناسب تدفّق دخل العائلة.' },
      },
      {
        icon: 'BellRing',
        title: { en: 'Automate reminders', ar: 'أتمتة التذكيرات' },
        body: {
          en: 'Consistent nudges recover revenue.',
          ar: 'التذكيرات المنتظمة تستعيد الإيرادات.',
        },
      },
    ],
    sections: [
      {
        heading: { en: 'Five steps to better collection', ar: 'خمس خطوات لتحصيل أفضل' },
        paragraphs: {
          en: [
            '1. Publish a clear fee schedule and policy up front. 2. Offer online payment and installment plans. 3. Send automated reminders before and after due dates. 4. Give finance staff a live dashboard of overdue balances. 5. Reconcile payments automatically to avoid disputes.',
            'Munaxa’s finance module does all five out of the box, including JoFotara-compliant e-invoicing for Jordan.',
          ],
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Do payment plans really reduce overdue fees?',
          ar: 'هل تقلّل خطط الدفع المتأخرات فعلاً؟',
        },
        answer: {
          en: 'Yes — splitting tuition into scheduled installments aligns with family income and reduces large, missed lump-sum payments.',
          ar: 'نعم، تقسيم الرسوم إلى أقساط مجدولة يتوافق مع دخل العائلة ويقلّل المدفوعات الكبيرة المتعثّرة.',
        },
      },
    ],
    related: { features: ['finance', 'einvoicing'], countries: ['jordan'], comparisons: ['excel'] },
  },
  {
    kind: 'article',
    slug: 'reduce-student-absence',
    icon: 'CalendarCheck',
    datePublished: '2026-03-05',
    name: { en: 'How to Reduce Student Absence', ar: 'كيف تقلّل غياب الطلاب' },
    seoTitle: {
      en: 'How to Reduce Student Absenteeism in Schools (2026)',
      ar: 'كيف تقلّل التغيّب الطلابي في المدارس (2026)',
    },
    metaDescription: {
      en: 'Chronic absence harms results. Learn how real-time attendance, automatic parent alerts and early-warning analytics reduce student absenteeism.',
      ar: 'يضرّ الغياب المتكرر بالنتائج. تعرّف على كيف يقلّل الحضور الفوري وتنبيهات الأهل التلقائية وتحليلات الإنذار المبكر من التغيّب.',
    },
    keywords: {
      en: ['reduce student absenteeism', 'chronic absence schools', 'improve attendance'],
      ar: ['تقليل غياب الطلاب', 'الغياب المتكرر'],
    },
    eyebrow: { en: 'Guide', ar: 'دليل' },
    headline: { en: 'How to reduce student absence', ar: 'كيف تقلّل غياب الطلاب' },
    intro: {
      en: 'You reduce absenteeism by catching it early: track attendance in real time, notify parents the same day, and use analytics to spot patterns before they become chronic.',
      ar: 'تقلّل الغياب بكشفه مبكراً: تابع الحضور لحظياً، وأبلغ الأهل في اليوم نفسه، واستخدم التحليلات لرصد الأنماط قبل أن تصبح مزمنة.',
    },
    highlights: [
      {
        icon: 'Clock',
        title: { en: 'Track in real time', ar: 'تابع لحظياً' },
        body: {
          en: 'Same-day data, not week-late registers.',
          ar: 'بيانات اليوم لا سجلات متأخرة أسبوعاً.',
        },
      },
      {
        icon: 'BellRing',
        title: { en: 'Tell parents today', ar: 'أبلغ الأهل اليوم' },
        body: { en: 'Automatic absence alerts to guardians.', ar: 'تنبيهات غياب تلقائية للأهل.' },
      },
      {
        icon: 'BarChart3',
        title: { en: 'Act on patterns', ar: 'تصرّف وفق الأنماط' },
        body: { en: 'Flag at-risk students early.', ar: 'نبّه عن الطلاب المعرّضين مبكراً.' },
      },
    ],
    faqs: [
      {
        question: { en: 'What counts as chronic absence?', ar: 'ما الذي يُعدّ غياباً مزمناً؟' },
        answer: {
          en: 'Commonly, missing 10% or more of school days. Early-warning analytics flag students approaching that threshold.',
          ar: 'عادةً التغيّب بنسبة 10% أو أكثر من أيام الدراسة. وتنبّه تحليلات الإنذار المبكر عن الطلاب المقتربين من هذا الحد.',
        },
      },
    ],
    related: { features: ['attendance', 'communication', 'analytics'] },
  },
  {
    kind: 'article',
    slug: 'jofotara-guide',
    icon: 'BadgeCheck',
    datePublished: '2026-02-25',
    dateModified: '2026-06-01',
    name: { en: 'JoFotara for Schools', ar: 'JoFotara للمدارس' },
    seoTitle: {
      en: 'JoFotara for Schools in Jordan: A Compliance Guide (2026)',
      ar: 'JoFotara للمدارس في الأردن: دليل الامتثال (2026)',
    },
    metaDescription: {
      en: 'JoFotara is Jordan’s national e-invoicing system. This guide explains what it means for private schools and how to issue compliant fee invoices.',
      ar: 'JoFotara هو نظام الفوترة الإلكترونية الوطني في الأردن. يشرح هذا الدليل ما يعنيه للمدارس الخاصة وكيفية إصدار فواتير رسوم متوافقة.',
    },
    keywords: {
      en: ['JoFotara schools', 'JoFotara guide', 'Jordan e-invoicing schools'],
      ar: ['JoFotara مدارس', 'دليل JoFotara', 'الفوترة الإلكترونية الأردن'],
    },
    eyebrow: { en: 'Guide', ar: 'دليل' },
    headline: {
      en: 'JoFotara for schools: a compliance guide',
      ar: 'JoFotara للمدارس: دليل الامتثال',
    },
    intro: {
      en: 'JoFotara is Jordan’s national electronic invoicing system. Private schools must issue fee invoices through it to stay compliant — which is simplest when your school software submits them automatically.',
      ar: 'JoFotara هو نظام الفوترة الإلكترونية الوطني في الأردن. على المدارس الخاصة إصدار فواتير الرسوم عبره للبقاء متوافقة — وهو أسهل عندما يرسلها برنامج مدرستك تلقائياً.',
    },
    highlights: [
      {
        icon: 'BadgeCheck',
        title: { en: 'National mandate', ar: 'إلزام وطني' },
        body: {
          en: 'Required electronic invoicing in Jordan.',
          ar: 'فوترة إلكترونية مطلوبة في الأردن.',
        },
      },
      {
        icon: 'Zap',
        title: { en: 'Automate it', ar: 'أتمتها' },
        body: {
          en: 'Let software submit invoices for you.',
          ar: 'دع البرمجيات تُرسل الفواتير عنك.',
        },
      },
      {
        icon: 'FileCheck2',
        title: { en: 'Stay audit-ready', ar: 'ابقَ جاهزاً للتدقيق' },
        body: {
          en: 'Keep verifiable records of every invoice.',
          ar: 'احتفظ بسجلات قابلة للتحقّق لكل فاتورة.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Does Munaxa handle JoFotara for us?',
          ar: 'هل تتولّى Munaxa أمر JoFotara عنا؟',
        },
        answer: {
          en: 'Yes — Munaxa submits compliant fee invoices to JoFotara automatically from its finance module.',
          ar: 'نعم، تُرسل Munaxa فواتير الرسوم المتوافقة إلى JoFotara تلقائياً من وحدة المالية.',
        },
      },
    ],
    related: {
      features: ['jofotara', 'finance', 'einvoicing'],
      countries: ['jordan'],
      integrations: ['jofotara'],
    },
  },
  {
    kind: 'article',
    slug: 'digital-transformation-schools',
    icon: 'Rocket',
    datePublished: '2026-01-30',
    name: { en: 'Digital Transformation for Schools', ar: 'التحوّل الرقمي للمدارس' },
    seoTitle: {
      en: 'Digital Transformation for Schools: A Practical Roadmap',
      ar: 'التحوّل الرقمي للمدارس: خارطة طريق عملية',
    },
    metaDescription: {
      en: 'Digital transformation in schools means replacing paper and silos with connected systems. Here’s a practical, low-risk roadmap to get there.',
      ar: 'يعني التحوّل الرقمي في المدارس استبدال الورق والعزل بأنظمة مترابطة. إليك خارطة طريق عملية ومنخفضة المخاطر للوصول.',
    },
    keywords: {
      en: ['digital transformation schools', 'school digitisation', 'paperless school roadmap'],
      ar: ['التحوّل الرقمي للمدارس', 'رقمنة المدارس'],
    },
    eyebrow: { en: 'Guide', ar: 'دليل' },
    headline: {
      en: 'A roadmap for school digital transformation',
      ar: 'خارطة طريق للتحوّل الرقمي المدرسي',
    },
    intro: {
      en: 'School digital transformation succeeds when it’s phased: digitise the highest-pain process first (usually fees or admissions), prove the value, then connect the rest onto one platform.',
      ar: 'ينجح التحوّل الرقمي للمدارس عندما يكون مرحلياً: رقمن أكثر العمليات إرهاقاً أولاً (غالباً الرسوم أو القبول)، أثبت القيمة، ثم اربط الباقي على منصة واحدة.',
    },
    highlights: [
      {
        icon: 'Target',
        title: { en: 'Start with one pain', ar: 'ابدأ بألم واحد' },
        body: {
          en: 'Fees or admissions usually deliver fastest ROI.',
          ar: 'الرسوم أو القبول تحقّقان عادةً أسرع عائد.',
        },
      },
      {
        icon: 'Layers',
        title: { en: 'Connect, don’t fragment', ar: 'اربط لا تجزّئ' },
        body: {
          en: 'One platform beats many disconnected tools.',
          ar: 'منصة واحدة أفضل من أدوات منفصلة كثيرة.',
        },
      },
      {
        icon: 'Users',
        title: { en: 'Bring staff along', ar: 'أشرك الكادر' },
        body: {
          en: 'Training and quick wins build adoption.',
          ar: 'التدريب والمكاسب السريعة يبنيان التبنّي.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'How long does it take?', ar: 'كم يستغرق ذلك؟' },
        answer: {
          en: 'A focused first phase can go live in weeks; a full school operating system rollout typically spans one term.',
          ar: 'يمكن إطلاق مرحلة أولى مركّزة خلال أسابيع، بينما يمتد تطبيق نظام تشغيل مدرسي كامل عادةً فصلاً دراسياً.',
        },
      },
    ],
    related: { comparisons: ['manual-administration', 'excel'], solutions: ['private-schools'] },
  },
  {
    kind: 'article',
    slug: 'school-cybersecurity',
    icon: 'Lock',
    datePublished: '2026-04-12',
    name: { en: 'School Cybersecurity Basics', ar: 'أساسيات الأمن السيبراني للمدارس' },
    seoTitle: {
      en: 'School Cybersecurity: Protecting Student Data in 2026',
      ar: 'الأمن السيبراني للمدارس: حماية بيانات الطلاب في 2026',
    },
    metaDescription: {
      en: 'Schools hold sensitive student and family data. Learn the cybersecurity basics every school should have: access control, encryption, backups and audit logs.',
      ar: 'تحتفظ المدارس ببيانات حسّاسة للطلاب والعائلات. تعرّف على أساسيات الأمن السيبراني التي يجب أن تمتلكها كل مدرسة: التحكّم بالوصول والتشفير والنسخ الاحتياطي وسجلات التدقيق.',
    },
    keywords: {
      en: ['school cybersecurity', 'student data protection', 'school data security basics'],
      ar: ['الأمن السيبراني للمدارس', 'حماية بيانات الطلاب'],
    },
    eyebrow: { en: 'Guide', ar: 'دليل' },
    headline: { en: 'School cybersecurity basics', ar: 'أساسيات الأمن السيبراني للمدارس' },
    intro: {
      en: 'Protecting student data comes down to four fundamentals: control who can access what, encrypt data, back it up reliably, and log every sensitive action so you can audit it.',
      ar: 'تتلخّص حماية بيانات الطلاب في أربعة أساسيات: التحكّم بمن يصل إلى ماذا، وتشفير البيانات، والنسخ الاحتياطي الموثوق، وتسجيل كل إجراء حسّاس لتتمكّن من تدقيقه.',
    },
    highlights: [
      {
        icon: 'UserCog',
        title: { en: 'Access control', ar: 'التحكّم بالوصول' },
        body: {
          en: 'Least-privilege, role-based permissions.',
          ar: 'صلاحيات حسب الدور وأقل امتياز.',
        },
      },
      {
        icon: 'Lock',
        title: { en: 'Encryption', ar: 'تشفير' },
        body: {
          en: 'Protect data in transit and at rest.',
          ar: 'احمِ البيانات أثناء النقل والتخزين.',
        },
      },
      {
        icon: 'ScrollText',
        title: { en: 'Audit logs', ar: 'سجلات تدقيق' },
        body: { en: 'Record and review sensitive actions.', ar: 'سجّل وراجع الإجراءات الحسّاسة.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Is cloud school software safe?', ar: 'هل برمجيات المدارس السحابية آمنة؟' },
        answer: {
          en: 'Reputable cloud platforms like Munaxa offer stronger security than most on-premise setups: encryption, isolation, backups and continuous monitoring.',
          ar: 'توفّر المنصات السحابية الموثوقة مثل Munaxa أماناً أقوى من معظم الإعدادات المحلية: تشفير وعزل ونسخ احتياطي ومراقبة مستمرة.',
        },
      },
    ],
    related: { features: ['security'], solutions: ['private-schools'] },
  },
];
