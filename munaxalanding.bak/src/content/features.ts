import type { ContentPage } from './types';

/**
 * Feature pages → /features/[slug]. Each is a self-contained, structured entry consumed by
 * the programmatic renderer. English is authoritative; Arabic is provided for the SEO-visible
 * fields (title, description, H1, lead, highlights, FAQ) with graceful fallback elsewhere.
 */
export const features: ContentPage[] = [
  {
    kind: 'feature',
    slug: 'attendance',
    icon: 'CalendarCheck',
    name: { en: 'Attendance', ar: 'الحضور والغياب' },
    seoTitle: {
      en: 'School Attendance System — Real-Time Student & Staff Attendance',
      ar: 'نظام حضور وغياب الطلاب — متابعة فورية للحضور',
    },
    metaDescription: {
      en: 'Track student and staff attendance in real time with automated parent absence alerts, period registers and analytics — for private schools in Jordan and MENA.',
      ar: 'تابع حضور الطلاب والموظفين لحظياً مع تنبيهات غياب تلقائية لأولياء الأمور وسجلات لكل حصة وتحليلات دقيقة، مصمّم للمدارس الخاصة في الأردن والمنطقة.',
    },
    keywords: {
      en: [
        'school attendance system',
        'student attendance software',
        'attendance management',
        'absence tracking',
        'period attendance',
      ],
      ar: ['نظام حضور المدارس', 'برنامج حضور الطلاب', 'إدارة الغياب', 'متابعة الحضور'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'A real-time attendance system for the whole school',
      ar: 'نظام حضور فوري للمدرسة بأكملها',
    },
    intro: {
      en: 'Munaxa replaces paper registers with live, period-by-period attendance that updates the moment a teacher marks it — and notifies parents of an absence automatically, in their language.',
      ar: 'تستبدل Munaxa السجلات الورقية بحضور فوري لكل حصة يُحدّث لحظة تسجيله من المعلّم، ويُشعر أولياء الأمور بالغياب تلقائياً وبلغتهم.',
    },
    highlights: [
      {
        icon: 'Clock',
        title: { en: 'Period & daily registers', ar: 'سجلات يومية ولكل حصة' },
        body: {
          en: 'Mark attendance per period or per day; late, excused and absent are tracked separately.',
          ar: 'سجّل الحضور لكل حصة أو لليوم كاملاً مع تمييز المتأخر والمعذور والغائب.',
        },
      },
      {
        icon: 'BellRing',
        title: { en: 'Automatic parent alerts', ar: 'تنبيهات تلقائية للأهل' },
        body: {
          en: 'Absences trigger instant SMS, email or app notifications to guardians.',
          ar: 'يرسل النظام إشعاراً فورياً للأهل عبر الرسائل أو البريد أو التطبيق عند الغياب.',
        },
      },
      {
        icon: 'BarChart3',
        title: { en: 'Attendance analytics', ar: 'تحليلات الحضور' },
        body: {
          en: 'Spot chronic absence early with per-student, class and grade-level trends.',
          ar: 'اكتشف الغياب المتكرر مبكراً عبر اتجاهات لكل طالب وصف ومرحلة.',
        },
      },
    ],
    sections: [
      {
        heading: { en: 'Why attendance matters', ar: 'لماذا الحضور مهم' },
        paragraphs: {
          en: [
            'Attendance is the earliest signal of a student at risk. When registers live in paper or spreadsheets, patterns are invisible until it is too late to intervene.',
            'Munaxa turns every mark into structured data — feeding safeguarding workflows, parent communication and ministry reporting from one source of truth.',
          ],
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Can teachers take attendance from a phone?',
          ar: 'هل يمكن للمعلّم تسجيل الحضور من الهاتف؟',
        },
        answer: {
          en: 'Yes. Teachers mark attendance from the Munaxa mobile app or any browser, and it syncs instantly.',
          ar: 'نعم، يسجّل المعلّم الحضور من تطبيق Munaxa أو من المتصفح ويتم المزامنة فوراً.',
        },
      },
      {
        question: { en: 'Are parents notified automatically?', ar: 'هل يتم إشعار الأهل تلقائياً؟' },
        answer: {
          en: 'Absences send an automatic notification to guardians in English or Arabic based on their preference.',
          ar: 'يرسل النظام إشعاراً تلقائياً لأولياء الأمور بالعربية أو الإنجليزية حسب تفضيلهم عند الغياب.',
        },
      },
    ],
    related: {
      features: ['communication', 'parent-portal', 'academics'],
      solutions: ['private-schools'],
      articles: ['reduce-student-absence'],
    },
  },
  {
    kind: 'feature',
    slug: 'admissions',
    icon: 'ClipboardCheck',
    name: { en: 'Admissions', ar: 'القبول والتسجيل' },
    seoTitle: {
      en: 'School Admissions Software — Online Enrollment & Registration',
      ar: 'برنامج قبول وتسجيل الطلاب — تسجيل إلكتروني',
    },
    metaDescription: {
      en: 'Run the full admissions funnel online: inquiries, applications, assessments, offers and enrollment. Reduce paperwork and convert more families with Munaxa.',
      ar: 'أدِر رحلة القبول كاملة إلكترونياً من الاستفسار والطلب والتقييم وحتى التسجيل، وقلّل الأعمال الورقية وزِد نسبة التسجيل مع Munaxa.',
    },
    keywords: {
      en: [
        'school admissions software',
        'online enrollment',
        'student registration system',
        'admissions management',
      ],
      ar: ['برنامج قبول الطلاب', 'تسجيل إلكتروني', 'نظام تسجيل الطلاب'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'Online admissions, from first inquiry to enrolled',
      ar: 'قبول إلكتروني من أول استفسار حتى التسجيل',
    },
    intro: {
      en: 'Capture every inquiry, move applicants through a clear pipeline, schedule assessments, and convert offers into enrollments — without a single paper form.',
      ar: 'استقبل كل استفسار وانقل المتقدمين عبر مسار واضح وجدوِل التقييمات وحوّل العروض إلى تسجيلات دون أي نموذج ورقي.',
    },
    highlights: [
      {
        icon: 'Inbox',
        title: { en: 'Lead-to-enrollment pipeline', ar: 'مسار من الاستفسار للتسجيل' },
        body: {
          en: 'A visual funnel shows exactly where every family is and what comes next.',
          ar: 'مسار مرئي يوضح موقع كل عائلة والخطوة التالية.',
        },
      },
      {
        icon: 'FileText',
        title: { en: 'Digital application forms', ar: 'نماذج طلب رقمية' },
        body: {
          en: 'Custom, bilingual forms with document upload and e-signature.',
          ar: 'نماذج مخصّصة بلغتين مع رفع المستندات والتوقيع الإلكتروني.',
        },
      },
      {
        icon: 'CalendarClock',
        title: { en: 'Assessment scheduling', ar: 'جدولة التقييمات' },
        body: {
          en: 'Book entrance assessments and interviews with automatic reminders.',
          ar: 'احجز اختبارات القبول والمقابلات مع تذكيرات تلقائية.',
        },
      },
    ],
    sections: [
      {
        heading: { en: 'A modern enrollment experience', ar: 'تجربة تسجيل حديثة' },
        paragraphs: {
          en: [
            'Families judge a school by its first interaction. A slow, paper-based admissions process loses applicants to faster competitors.',
            'Munaxa gives parents a polished online journey while giving your team a single dashboard to manage capacity, waitlists and yield.',
          ],
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Can we customise the application form?',
          ar: 'هل يمكن تخصيص نموذج الطلب؟',
        },
        answer: {
          en: 'Yes — build bilingual forms with any fields, required documents and conditional logic.',
          ar: 'نعم، يمكنك بناء نماذج بلغتين بأي حقول ومستندات مطلوبة ومنطق شرطي.',
        },
      },
      {
        question: {
          en: 'Does admissions connect to enrollment and billing?',
          ar: 'هل يرتبط القبول بالتسجيل والفوترة؟',
        },
        answer: {
          en: 'Accepted applicants flow straight into the student record and finance module — no re-keying.',
          ar: 'ينتقل المقبولون مباشرة إلى سجل الطالب ووحدة المالية دون إعادة إدخال.',
        },
      },
    ],
    related: {
      features: ['finance', 'parent-portal'],
      solutions: ['private-schools', 'international-schools'],
      articles: ['digital-transformation-schools'],
    },
  },
  {
    kind: 'feature',
    slug: 'academics',
    icon: 'GraduationCap',
    name: { en: 'Academics', ar: 'الشؤون الأكاديمية' },
    seoTitle: {
      en: 'Academic Management Software — Grades, Report Cards & Curriculum',
      ar: 'برنامج الإدارة الأكاديمية — الدرجات والتقارير والمنهج',
    },
    metaDescription: {
      en: 'Manage curriculum, gradebooks, assessments and report cards in one place. Munaxa supports national and international curricula with bilingual report cards.',
      ar: 'أدِر المنهج وسجلات الدرجات والتقييمات وكشوف العلامات في مكان واحد، مع دعم المناهج الوطنية والدولية وكشوف بلغتين.',
    },
    keywords: {
      en: [
        'academic management software',
        'gradebook software',
        'report card software',
        'curriculum management',
      ],
      ar: ['برنامج إدارة أكاديمية', 'سجل الدرجات', 'كشوف العلامات'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'Curriculum, grades and report cards in one place',
      ar: 'المنهج والدرجات وكشوف العلامات في مكان واحد',
    },
    intro: {
      en: 'From curriculum planning to gradebooks and automated report cards, Munaxa gives teachers and academic leaders a single system for everything academic.',
      ar: 'من تخطيط المنهج إلى سجلات الدرجات وكشوف العلامات التلقائية، تمنح Munaxa المعلّمين والقادة الأكاديميين نظاماً واحداً لكل ما هو أكاديمي.',
    },
    highlights: [
      {
        icon: 'BookOpen',
        title: { en: 'Flexible gradebooks', ar: 'سجلات درجات مرنة' },
        body: {
          en: 'Weighted assessments, rubrics and grading scales for any curriculum.',
          ar: 'تقييمات موزونة وروبركس وسلالم تقدير لأي منهج.',
        },
      },
      {
        icon: 'FileBadge',
        title: { en: 'Automated report cards', ar: 'كشوف علامات تلقائية' },
        body: {
          en: 'Generate branded, bilingual report cards in a click.',
          ar: 'أنشئ كشوف علامات بلغتين بهوية المدرسة بنقرة واحدة.',
        },
      },
      {
        icon: 'Target',
        title: { en: 'Standards & outcomes', ar: 'المعايير والنواتج' },
        body: {
          en: 'Track mastery against curriculum standards and learning outcomes.',
          ar: 'تابع الإتقان مقابل معايير المنهج ونواتج التعلّم.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Does it support international curricula?',
          ar: 'هل يدعم المناهج الدولية؟',
        },
        answer: {
          en: 'Yes — configure grading for British, American, IB and national curricula side by side.',
          ar: 'نعم، يمكن إعداد التقييم للمناهج البريطانية والأمريكية والبكالوريا الدولية والوطنية معاً.',
        },
      },
    ],
    related: {
      features: ['attendance', 'reporting', 'parent-portal'],
      solutions: ['k12', 'international-schools'],
    },
  },
  {
    kind: 'feature',
    slug: 'finance',
    icon: 'Wallet',
    name: { en: 'Finance', ar: 'المالية' },
    seoTitle: {
      en: 'School Finance Software — Fees, Invoicing & Collections',
      ar: 'برنامج مالية المدارس — الرسوم والفواتير والتحصيل',
    },
    metaDescription: {
      en: 'Automate tuition fees, invoicing, payment plans and collections with full JoFotara e-invoicing support. Munaxa gives school finance teams real-time visibility.',
      ar: 'أتمتة الرسوم الدراسية والفواتير وخطط الدفع والتحصيل مع دعم كامل للفوترة الإلكترونية (JoFotara)، وتمنح فرق المالية رؤية فورية.',
    },
    keywords: {
      en: [
        'school finance software',
        'school fee management',
        'tuition billing software',
        'fee collection',
        'e-invoicing schools',
      ],
      ar: ['برنامج مالية المدارس', 'إدارة الرسوم المدرسية', 'تحصيل الرسوم', 'الفوترة الإلكترونية'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'School finance, fees and collections — automated',
      ar: 'مالية المدرسة والرسوم والتحصيل — مؤتمتة',
    },
    intro: {
      en: 'Generate tuition invoices, offer payment plans, reconcile payments and stay compliant with Jordan’s JoFotara e-invoicing — all from one finance module.',
      ar: 'أنشئ فواتير الرسوم وقدّم خطط الدفع وطابق المدفوعات والتزم بالفوترة الإلكترونية الأردنية (JoFotara) من وحدة مالية واحدة.',
    },
    highlights: [
      {
        icon: 'ReceiptText',
        title: { en: 'Automated invoicing', ar: 'فوترة تلقائية' },
        body: {
          en: 'Bulk-generate tuition invoices with discounts, scholarships and siblings logic.',
          ar: 'أنشئ فواتير الرسوم بالجملة مع الخصومات والمنح ومنطق الإخوة.',
        },
      },
      {
        icon: 'CreditCard',
        title: { en: 'Payment plans & online pay', ar: 'خطط الدفع والدفع الإلكتروني' },
        body: {
          en: 'Installment plans and online payment reduce overdue balances.',
          ar: 'خطط أقساط ودفع إلكتروني يقلّلان المتأخرات.',
        },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'JoFotara e-invoicing', ar: 'فوترة JoFotara' },
        body: {
          en: 'Native compliance with Jordan’s national e-invoicing system.',
          ar: 'توافق أصيل مع نظام الفوترة الوطني في الأردن.',
        },
      },
    ],
    sections: [
      {
        heading: { en: 'Cash flow you can see', ar: 'تدفّق نقدي واضح' },
        paragraphs: {
          en: [
            'Late and missed fees are the single biggest threat to a private school’s budget. Spreadsheets hide the real collection picture until the term is over.',
            'Munaxa gives finance teams live dashboards of billed, collected and overdue amounts, with automated reminders that recover revenue without awkward phone calls.',
          ],
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Is Munaxa compliant with JoFotara?', ar: 'هل تتوافق Munaxa مع JoFotara؟' },
        answer: {
          en: 'Yes. Munaxa supports Jordan’s JoFotara national e-invoicing so every fee invoice is compliant.',
          ar: 'نعم، تدعم Munaxa نظام الفوترة الوطني JoFotara لتكون كل فاتورة رسوم متوافقة.',
        },
      },
      {
        question: { en: 'Can parents pay online?', ar: 'هل يمكن للأهل الدفع إلكترونياً؟' },
        answer: {
          en: 'Parents view balances and pay securely online from the parent portal and mobile app.',
          ar: 'يطّلع الأهل على الأرصدة ويدفعون بأمان عبر بوابة وتطبيق ولي الأمر.',
        },
      },
    ],
    related: {
      features: ['einvoicing', 'jofotara', 'reporting'],
      comparisons: ['excel'],
      articles: ['fee-collection-strategy'],
      countries: ['jordan'],
    },
  },
  {
    kind: 'feature',
    slug: 'hr',
    icon: 'Users',
    name: { en: 'HR', ar: 'الموارد البشرية' },
    seoTitle: {
      en: 'School HR Software — Staff, Payroll & Leave Management',
      ar: 'برنامج الموارد البشرية للمدارس — الموظفون والرواتب والإجازات',
    },
    metaDescription: {
      en: 'Manage staff records, contracts, leave, payroll inputs and appraisals for teachers and support staff in one HR module built for schools.',
      ar: 'أدِر سجلات الموظفين والعقود والإجازات ومدخلات الرواتب وتقييم الأداء للمعلّمين والإداريين في وحدة موارد بشرية مصمّمة للمدارس.',
    },
    keywords: {
      en: ['school hr software', 'staff management', 'teacher payroll', 'leave management schools'],
      ar: ['برنامج موارد بشرية للمدارس', 'إدارة الموظفين', 'رواتب المعلمين'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'HR built for schools and their staff',
      ar: 'موارد بشرية مصمّمة للمدارس وكوادرها',
    },
    intro: {
      en: 'Keep staff records, contracts, leave and payroll inputs organised — with the academic context schools need, like timetable load and substitution.',
      ar: 'حافظ على تنظيم سجلات الموظفين والعقود والإجازات ومدخلات الرواتب ضمن السياق الأكاديمي الذي تحتاجه المدارس مثل الأنصبة والتغطية.',
    },
    highlights: [
      {
        icon: 'IdCard',
        title: { en: 'Staff records', ar: 'سجلات الموظفين' },
        body: {
          en: 'Contracts, documents, qualifications and renewals in one profile.',
          ar: 'العقود والمستندات والمؤهلات والتجديدات في ملف واحد.',
        },
      },
      {
        icon: 'CalendarOff',
        title: { en: 'Leave & substitution', ar: 'الإجازات والتغطية' },
        body: {
          en: 'Approve leave and arrange cover without breaking the timetable.',
          ar: 'اعتمد الإجازات ورتّب التغطية دون إرباك الجدول.',
        },
      },
      {
        icon: 'Wallet',
        title: { en: 'Payroll inputs', ar: 'مدخلات الرواتب' },
        body: {
          en: 'Export clean payroll data with allowances and deductions.',
          ar: 'صدّر بيانات رواتب دقيقة مع البدلات والاستقطاعات.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Does HR link to attendance and timetables?',
          ar: 'هل ترتبط الموارد البشرية بالحضور والجداول؟',
        },
        answer: {
          en: 'Yes — staff attendance, teaching load and substitutions stay connected to academics.',
          ar: 'نعم، يرتبط حضور الموظفين والنصاب التدريسي والتغطية بالشؤون الأكاديمية.',
        },
      },
    ],
    related: { features: ['attendance', 'reporting'], solutions: ['school-groups'] },
  },
  {
    kind: 'feature',
    slug: 'transportation',
    icon: 'Bus',
    name: { en: 'Transportation', ar: 'النقل المدرسي' },
    seoTitle: {
      en: 'School Transportation Software — Bus Routes & Live Tracking',
      ar: 'برنامج النقل المدرسي — المسارات والتتبّع المباشر',
    },
    metaDescription: {
      en: 'Plan bus routes, assign students, track buses live and reassure parents with arrival alerts. Munaxa’s transport module keeps every ride safe and accountable.',
      ar: 'خطّط مسارات الحافلات وعيّن الطلاب وتتبّع الحافلات مباشرة وطمئن الأهل بإشعارات الوصول، لتبقى كل رحلة آمنة وموثّقة.',
    },
    keywords: {
      en: [
        'school transportation software',
        'school bus tracking',
        'bus route management',
        'student transport',
      ],
      ar: ['برنامج النقل المدرسي', 'تتبّع الحافلات المدرسية', 'إدارة مسارات الحافلات'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: { en: 'Safe, tracked school transportation', ar: 'نقل مدرسي آمن وقابل للتتبّع' },
    intro: {
      en: 'Design routes, assign students to buses, and give parents live tracking with pickup and drop-off alerts — so every journey is safe and accounted for.',
      ar: 'صمّم المسارات وعيّن الطلاب على الحافلات وامنح الأهل تتبّعاً مباشراً مع إشعارات الركوب والنزول لتكون كل رحلة آمنة وموثّقة.',
    },
    highlights: [
      {
        icon: 'Route',
        title: { en: 'Route planning', ar: 'تخطيط المسارات' },
        body: {
          en: 'Build efficient routes and assign students with capacity limits.',
          ar: 'ابنِ مسارات فعّالة وعيّن الطلاب ضمن سعة محددة.',
        },
      },
      {
        icon: 'MapPin',
        title: { en: 'Live bus tracking', ar: 'تتبّع مباشر للحافلات' },
        body: {
          en: 'Parents and admins see buses on a live map.',
          ar: 'يرى الأهل والإدارة الحافلات على خريطة مباشرة.',
        },
      },
      {
        icon: 'BellRing',
        title: { en: 'Arrival alerts', ar: 'إشعارات الوصول' },
        body: {
          en: 'Automatic pickup and drop-off notifications to guardians.',
          ar: 'إشعارات تلقائية للأهل عند الركوب والنزول.',
        },
      },
    ],
    faqs: [
      {
        question: {
          en: 'Can parents track the bus in real time?',
          ar: 'هل يستطيع الأهل تتبّع الحافلة لحظياً؟',
        },
        answer: {
          en: 'Yes, parents follow their child’s bus live and receive pickup/drop-off alerts.',
          ar: 'نعم، يتابع الأهل حافلة أبنائهم مباشرة ويتلقّون إشعارات الركوب والنزول.',
        },
      },
    ],
    related: { features: ['communication', 'security'], countries: ['jordan', 'uae'] },
  },
  {
    kind: 'feature',
    slug: 'communication',
    icon: 'MessageCircle',
    name: { en: 'Communication', ar: 'التواصل' },
    seoTitle: {
      en: 'School Communication Software — Parent Messaging & Announcements',
      ar: 'برنامج التواصل المدرسي — مراسلة الأهل والإعلانات',
    },
    metaDescription: {
      en: 'Reach every parent in their language with announcements, messaging, newsletters and emergency alerts — all logged and measurable inside Munaxa.',
      ar: 'تواصل مع كل ولي أمر بلغته عبر الإعلانات والرسائل والنشرات والتنبيهات الطارئة، مع توثيق كامل وقابلية للقياس داخل Munaxa.',
    },
    keywords: {
      en: [
        'school communication software',
        'parent communication app',
        'school messaging',
        'school announcements',
      ],
      ar: ['برنامج التواصل المدرسي', 'تطبيق تواصل الأهل', 'إعلانات المدرسة'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: { en: 'One channel to reach every parent', ar: 'قناة واحدة للوصول إلى كل ولي أمر' },
    intro: {
      en: 'Send announcements, direct messages, newsletters and emergency alerts in English or Arabic — and know they were delivered and read.',
      ar: 'أرسل الإعلانات والرسائل المباشرة والنشرات والتنبيهات الطارئة بالعربية أو الإنجليزية، واعرف أنها وصلت وقُرئت.',
    },
    highlights: [
      {
        icon: 'Megaphone',
        title: { en: 'Targeted announcements', ar: 'إعلانات موجّهة' },
        body: {
          en: 'Message a class, grade or the whole school in seconds.',
          ar: 'راسل صفاً أو مرحلة أو المدرسة كاملة في ثوانٍ.',
        },
      },
      {
        icon: 'Languages',
        title: { en: 'Bilingual by default', ar: 'بلغتين افتراضياً' },
        body: {
          en: 'Each parent reads in their preferred language.',
          ar: 'يقرأ كل ولي أمر بلغته المفضّلة.',
        },
      },
      {
        icon: 'CheckCheck',
        title: { en: 'Delivery & read receipts', ar: 'إيصالات التسليم والقراءة' },
        body: {
          en: 'See exactly who received and opened each message.',
          ar: 'اعرف بدقة من استلم كل رسالة وفتحها.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Can we send emergency alerts?', ar: 'هل يمكن إرسال تنبيهات طارئة؟' },
        answer: {
          en: 'Yes — broadcast urgent alerts instantly across app, SMS and email.',
          ar: 'نعم، يمكن بث التنبيهات العاجلة فوراً عبر التطبيق والرسائل والبريد.',
        },
      },
    ],
    related: {
      features: ['parent-portal', 'attendance', 'mobile-app'],
      articles: ['reduce-student-absence'],
    },
  },
  {
    kind: 'feature',
    slug: 'parent-portal',
    icon: 'Smartphone',
    name: { en: 'Parent Portal', ar: 'بوابة ولي الأمر' },
    seoTitle: {
      en: 'Parent Portal Software — Grades, Fees & Attendance for Parents',
      ar: 'برنامج بوابة ولي الأمر — الدرجات والرسوم والحضور',
    },
    metaDescription: {
      en: 'Give parents one secure portal and app for grades, attendance, fees, messages and the school calendar — in English or Arabic.',
      ar: 'امنح الأهل بوابة وتطبيقاً آمناً للاطّلاع على الدرجات والحضور والرسوم والرسائل والتقويم المدرسي بالعربية أو الإنجليزية.',
    },
    keywords: {
      en: ['parent portal software', 'school parent app', 'parent communication portal'],
      ar: ['بوابة ولي الأمر', 'تطبيق أولياء الأمور', 'بوابة الأهل'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'Everything parents need, in one secure portal',
      ar: 'كل ما يحتاجه الأهل في بوابة آمنة واحدة',
    },
    intro: {
      en: 'Parents get a single, secure place — web and mobile — to follow grades, attendance, fees, messages and events for all their children.',
      ar: 'يحصل الأهل على مكان واحد آمن عبر الويب والجوال لمتابعة الدرجات والحضور والرسوم والرسائل والفعاليات لجميع أبنائهم.',
    },
    highlights: [
      {
        icon: 'LayoutDashboard',
        title: { en: 'One view, all children', ar: 'عرض واحد لكل الأبناء' },
        body: {
          en: 'Multi-child families switch between students in one login.',
          ar: 'تتنقّل العائلات بين الأبناء بتسجيل دخول واحد.',
        },
      },
      {
        icon: 'Wallet',
        title: { en: 'Fees & payments', ar: 'الرسوم والمدفوعات' },
        body: {
          en: 'View balances and pay online securely.',
          ar: 'اطّلع على الأرصدة وادفع إلكترونياً بأمان.',
        },
      },
      {
        icon: 'CalendarDays',
        title: { en: 'Calendar & events', ar: 'التقويم والفعاليات' },
        body: {
          en: 'Never miss a holiday, exam or parent evening.',
          ar: 'لا تفوّت عطلة أو امتحاناً أو لقاء أولياء أمور.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Is there a mobile app?', ar: 'هل يوجد تطبيق جوال؟' },
        answer: {
          en: 'Yes — the parent portal is available as iOS and Android apps and on the web.',
          ar: 'نعم، تتوفّر بوابة ولي الأمر كتطبيق iOS وأندرويد وعلى الويب.',
        },
      },
    ],
    related: {
      features: ['communication', 'finance', 'attendance'],
      solutions: ['private-schools'],
    },
  },
  {
    kind: 'feature',
    slug: 'reporting',
    icon: 'BarChart3',
    name: { en: 'Reporting & Analytics', ar: 'التقارير والتحليلات' },
    seoTitle: {
      en: 'School Reporting & Analytics Software — Dashboards & Insights',
      ar: 'برنامج تقارير وتحليلات المدارس — لوحات ورؤى',
    },
    metaDescription: {
      en: 'Turn school data into decisions with live dashboards across academics, attendance, finance and admissions — exportable and ready for leadership and boards.',
      ar: 'حوّل بيانات المدرسة إلى قرارات عبر لوحات مباشرة للأكاديمي والحضور والمالية والقبول، قابلة للتصدير وجاهزة للقيادة والمجالس.',
    },
    keywords: {
      en: ['school analytics software', 'school reporting software', 'education dashboards'],
      ar: ['برنامج تحليلات المدارس', 'تقارير المدارس'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'Reporting and analytics for school leaders',
      ar: 'تقارير وتحليلات لقادة المدارس',
    },
    intro: {
      en: 'Live dashboards turn every module’s data into clear answers for leadership — academic performance, attendance trends, collections and enrollment, all in one place.',
      ar: 'تحوّل اللوحات المباشرة بيانات كل وحدة إلى إجابات واضحة للقيادة — الأداء الأكاديمي واتجاهات الحضور والتحصيل والتسجيل في مكان واحد.',
    },
    highlights: [
      {
        icon: 'LayoutDashboard',
        title: { en: 'Leadership dashboards', ar: 'لوحات للقيادة' },
        body: {
          en: 'KPIs across every department at a glance.',
          ar: 'مؤشرات أداء لكل الأقسام بنظرة واحدة.',
        },
      },
      {
        icon: 'Download',
        title: { en: 'Exportable reports', ar: 'تقارير قابلة للتصدير' },
        body: { en: 'Board-ready exports in a click.', ar: 'تصدير جاهز للمجالس بنقرة.' },
      },
      {
        icon: 'TrendingUp',
        title: { en: 'Trends & forecasts', ar: 'اتجاهات وتوقّعات' },
        body: {
          en: 'Spot patterns before they become problems.',
          ar: 'اكتشف الأنماط قبل أن تصبح مشكلات.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'Can we export reports?', ar: 'هل يمكن تصدير التقارير؟' },
        answer: {
          en: 'Yes — export to PDF and spreadsheets for boards and ministries.',
          ar: 'نعم، صدّر إلى PDF وجداول للمجالس والوزارات.',
        },
      },
    ],
    related: { features: ['finance', 'academics', 'attendance'], solutions: ['school-groups'] },
  },
  {
    kind: 'feature',
    slug: 'mobile-app',
    icon: 'Smartphone',
    name: { en: 'Mobile App', ar: 'تطبيق الجوال' },
    seoTitle: {
      en: 'School Mobile App — iOS & Android for Parents and Staff',
      ar: 'تطبيق المدرسة للجوال — iOS وأندرويد للأهل والموظفين',
    },
    metaDescription: {
      en: 'Native iOS and Android apps put attendance, grades, fees and messaging in the pockets of parents, teachers and staff — branded for your school.',
      ar: 'تطبيقات أصيلة لـ iOS وأندرويد تضع الحضور والدرجات والرسوم والرسائل في جيوب الأهل والمعلّمين والموظفين بهوية مدرستك.',
    },
    keywords: {
      en: ['school mobile app', 'school app iOS Android', 'parent teacher app'],
      ar: ['تطبيق المدرسة', 'تطبيق الأهل والمعلمين'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: { en: 'Your whole school in a mobile app', ar: 'مدرستك كاملة في تطبيق جوال' },
    intro: {
      en: 'Parents, teachers and staff carry the school in their pocket — attendance, grades, fees, messages and alerts in fast, native iOS and Android apps.',
      ar: 'يحمل الأهل والمعلّمون والموظفون المدرسة في جيوبهم — الحضور والدرجات والرسوم والرسائل والتنبيهات في تطبيقات أصيلة سريعة لـ iOS وأندرويد.',
    },
    highlights: [
      {
        icon: 'Smartphone',
        title: { en: 'Native iOS & Android', ar: 'أصيل لـ iOS وأندرويد' },
        body: {
          en: 'Fast apps, not a wrapped website.',
          ar: 'تطبيقات سريعة وليست موقعاً مغلّفاً.',
        },
      },
      {
        icon: 'BellRing',
        title: { en: 'Push notifications', ar: 'إشعارات فورية' },
        body: { en: 'Instant alerts that get noticed.', ar: 'تنبيهات فورية يُلتفت إليها.' },
      },
      {
        icon: 'Fingerprint',
        title: { en: 'Secure sign-in', ar: 'دخول آمن' },
        body: { en: 'Biometric login for peace of mind.', ar: 'دخول بالبصمة لراحة البال.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Are the apps branded for our school?', ar: 'هل التطبيقات بهوية مدرستنا؟' },
        answer: {
          en: 'Yes — apps carry your school’s name and branding.',
          ar: 'نعم، تحمل التطبيقات اسم مدرستك وهويتها.',
        },
      },
    ],
    related: { features: ['parent-portal', 'communication', 'student-app'] },
  },
  {
    kind: 'feature',
    slug: 'student-app',
    icon: 'BookOpenCheck',
    name: { en: 'Student App', ar: 'تطبيق الطالب' },
    seoTitle: {
      en: 'Student App — Timetable, Homework & Grades for Students',
      ar: 'تطبيق الطالب — الجدول والواجبات والدرجات',
    },
    metaDescription: {
      en: 'Give students their own app for timetables, homework, grades and announcements — keeping them organised and engaged in their learning.',
      ar: 'امنح الطلاب تطبيقهم الخاص للجداول والواجبات والدرجات والإعلانات ليبقوا منظّمين ومنخرطين في تعلّمهم.',
    },
    keywords: {
      en: ['student app', 'student portal', 'homework app school'],
      ar: ['تطبيق الطالب', 'بوابة الطالب'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: { en: 'An app built for students', ar: 'تطبيق مصمّم للطلاب' },
    intro: {
      en: 'Students get a focused app for their timetable, homework, grades and school announcements — helping them stay organised and take ownership of learning.',
      ar: 'يحصل الطلاب على تطبيق مركّز لجدولهم وواجباتهم ودرجاتهم وإعلانات المدرسة، يساعدهم على التنظيم وتحمّل مسؤولية تعلّمهم.',
    },
    highlights: [
      {
        icon: 'CalendarDays',
        title: { en: 'Timetable', ar: 'الجدول' },
        body: {
          en: 'Today’s lessons and rooms at a glance.',
          ar: 'دروس اليوم والقاعات بنظرة واحدة.',
        },
      },
      {
        icon: 'NotebookPen',
        title: { en: 'Homework', ar: 'الواجبات' },
        body: {
          en: 'Assignments and due dates in one list.',
          ar: 'الواجبات ومواعيد التسليم في قائمة واحدة.',
        },
      },
      {
        icon: 'Award',
        title: { en: 'Grades', ar: 'الدرجات' },
        body: { en: 'Track progress as results are posted.', ar: 'تابع التقدّم مع نشر النتائج.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Do students get their own logins?', ar: 'هل للطلاب حسابات خاصة؟' },
        answer: {
          en: 'Yes — each student has a secure account scoped to their data.',
          ar: 'نعم، لكل طالب حساب آمن مقصور على بياناته.',
        },
      },
    ],
    related: { features: ['academics', 'mobile-app', 'parent-portal'] },
  },
  {
    kind: 'feature',
    slug: 'einvoicing',
    icon: 'ReceiptText',
    name: { en: 'E-Invoicing', ar: 'الفوترة الإلكترونية' },
    seoTitle: {
      en: 'School E-Invoicing Software — Compliant Electronic Invoices',
      ar: 'برنامج الفوترة الإلكترونية للمدارس — فواتير متوافقة',
    },
    metaDescription: {
      en: 'Issue compliant electronic invoices for school fees with full audit trails and tax integration — including Jordan’s JoFotara national e-invoicing.',
      ar: 'أصدر فواتير إلكترونية متوافقة لرسوم المدارس مع مسارات تدقيق كاملة وتكامل ضريبي، بما في ذلك الفوترة الوطنية JoFotara في الأردن.',
    },
    keywords: {
      en: ['school e-invoicing', 'electronic invoicing schools', 'tax compliant invoices'],
      ar: ['الفوترة الإلكترونية للمدارس', 'فواتير متوافقة ضريبياً'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'Compliant e-invoicing for school fees',
      ar: 'فوترة إلكترونية متوافقة لرسوم المدارس',
    },
    intro: {
      en: 'Every fee invoice is issued electronically and compliantly, with audit trails and tax-authority integration — including native support for Jordan’s JoFotara.',
      ar: 'تُصدر كل فاتورة رسوم إلكترونياً وبتوافق كامل مع مسارات تدقيق وتكامل مع الجهات الضريبية، بما في ذلك دعم أصيل لـ JoFotara في الأردن.',
    },
    highlights: [
      {
        icon: 'ShieldCheck',
        title: { en: 'Tax compliant', ar: 'متوافق ضريبياً' },
        body: { en: 'Meets national e-invoicing mandates.', ar: 'يلبّي متطلبات الفوترة الوطنية.' },
      },
      {
        icon: 'FileCheck2',
        title: { en: 'Full audit trail', ar: 'مسار تدقيق كامل' },
        body: {
          en: 'Every invoice is traceable and verifiable.',
          ar: 'كل فاتورة قابلة للتتبّع والتحقّق.',
        },
      },
      {
        icon: 'Repeat',
        title: { en: 'Automated', ar: 'مؤتمت' },
        body: { en: 'Issue at scale without manual work.', ar: 'إصدار بالجملة دون عمل يدوي.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Does it support JoFotara?', ar: 'هل يدعم JoFotara؟' },
        answer: {
          en: 'Yes — Munaxa supports Jordan’s JoFotara national e-invoicing natively.',
          ar: 'نعم، تدعم Munaxa نظام JoFotara الوطني في الأردن بشكل أصيل.',
        },
      },
    ],
    related: {
      features: ['finance', 'jofotara'],
      countries: ['jordan'],
      integrations: ['jofotara'],
    },
  },
  {
    kind: 'feature',
    slug: 'jofotara',
    icon: 'BadgeCheck',
    name: { en: 'JoFotara', ar: 'JoFotara' },
    seoTitle: {
      en: 'JoFotara Integration for Schools — Jordan E-Invoicing',
      ar: 'تكامل JoFotara للمدارس — الفوترة الإلكترونية في الأردن',
    },
    metaDescription: {
      en: 'Munaxa connects school fee invoicing directly to Jordan’s JoFotara national e-invoicing system — compliant, automatic and audit-ready.',
      ar: 'تربط Munaxa فوترة رسوم المدارس مباشرة بنظام الفوترة الوطني JoFotara في الأردن — متوافق وتلقائي وجاهز للتدقيق.',
    },
    keywords: {
      en: ['JoFotara schools', 'JoFotara integration', 'Jordan e-invoicing schools'],
      ar: ['JoFotara مدارس', 'تكامل JoFotara', 'الفوترة الإلكترونية الأردن'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: {
      en: 'Native JoFotara e-invoicing for Jordanian schools',
      ar: 'فوترة JoFotara أصيلة للمدارس الأردنية',
    },
    intro: {
      en: 'Munaxa submits compliant school fee invoices to Jordan’s JoFotara system automatically — so finance teams stay compliant without extra steps.',
      ar: 'تُرسل Munaxa فواتير رسوم المدارس المتوافقة إلى نظام JoFotara الأردني تلقائياً، لتبقى فرق المالية متوافقة دون خطوات إضافية.',
    },
    highlights: [
      {
        icon: 'BadgeCheck',
        title: { en: 'Compliant by default', ar: 'متوافق افتراضياً' },
        body: { en: 'Meets Jordan’s e-invoicing mandate.', ar: 'يلبّي إلزام الفوترة في الأردن.' },
      },
      {
        icon: 'Zap',
        title: { en: 'Automatic submission', ar: 'إرسال تلقائي' },
        body: {
          en: 'Invoices flow to JoFotara without manual export.',
          ar: 'تنتقل الفواتير إلى JoFotara دون تصدير يدوي.',
        },
      },
      {
        icon: 'FileCheck2',
        title: { en: 'Audit-ready', ar: 'جاهز للتدقيق' },
        body: {
          en: 'Every submission is logged and verifiable.',
          ar: 'كل إرسال موثّق وقابل للتحقّق.',
        },
      },
    ],
    faqs: [
      {
        question: { en: 'What is JoFotara?', ar: 'ما هو JoFotara؟' },
        answer: {
          en: 'JoFotara is Jordan’s national electronic invoicing system; Munaxa integrates with it for school fees.',
          ar: 'JoFotara هو نظام الفوترة الإلكترونية الوطني في الأردن، وتتكامل معه Munaxa لرسوم المدارس.',
        },
      },
    ],
    related: {
      features: ['finance', 'einvoicing'],
      countries: ['jordan'],
      integrations: ['jofotara'],
      articles: ['jofotara-guide'],
    },
  },
  {
    kind: 'feature',
    slug: 'security',
    icon: 'Lock',
    name: { en: 'Security', ar: 'الأمان' },
    seoTitle: {
      en: 'School Data Security & Privacy — Enterprise-Grade Protection',
      ar: 'أمان وخصوصية بيانات المدارس — حماية بمستوى مؤسسي',
    },
    metaDescription: {
      en: 'Protect student and family data with enterprise security: role-based access, encryption, audit logs, multi-tenant isolation and data-residency options.',
      ar: 'احمِ بيانات الطلاب والعائلات بأمان مؤسسي: صلاحيات حسب الدور وتشفير وسجلات تدقيق وعزل متعدد المستأجرين وخيارات استضافة البيانات.',
    },
    keywords: {
      en: ['school data security', 'student data privacy', 'school cybersecurity'],
      ar: ['أمان بيانات المدارس', 'خصوصية بيانات الطلاب', 'الأمن السيبراني للمدارس'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: { en: 'Enterprise security for student data', ar: 'أمان مؤسسي لبيانات الطلاب' },
    intro: {
      en: 'Student and family data deserve serious protection. Munaxa is built on role-based access, encryption, audit logging and strict multi-tenant isolation.',
      ar: 'تستحق بيانات الطلاب والعائلات حماية جادّة. بُنيت Munaxa على صلاحيات حسب الدور والتشفير وسجلات التدقيق والعزل الصارم متعدد المستأجرين.',
    },
    highlights: [
      {
        icon: 'UserCog',
        title: { en: 'Role-based access', ar: 'صلاحيات حسب الدور' },
        body: { en: 'Everyone sees only what they should.', ar: 'يرى كل مستخدم ما يخصّه فقط.' },
      },
      {
        icon: 'Lock',
        title: { en: 'Encryption', ar: 'تشفير' },
        body: {
          en: 'Data encrypted in transit and at rest.',
          ar: 'بيانات مشفّرة أثناء النقل والتخزين.',
        },
      },
      {
        icon: 'ScrollText',
        title: { en: 'Audit logs', ar: 'سجلات تدقيق' },
        body: { en: 'Every sensitive action is recorded.', ar: 'كل إجراء حسّاس مُسجّل.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Where is our data stored?', ar: 'أين تُخزّن بياناتنا؟' },
        answer: {
          en: 'Munaxa offers data-residency options and strict tenant isolation per school.',
          ar: 'توفّر Munaxa خيارات لاستضافة البيانات وعزلاً صارماً لكل مدرسة.',
        },
      },
    ],
    related: { features: ['hr', 'reporting'], articles: ['school-cybersecurity'] },
  },
  {
    kind: 'feature',
    slug: 'analytics',
    icon: 'PieChart',
    name: { en: 'Analytics', ar: 'التحليلات' },
    seoTitle: {
      en: 'School Analytics Software — Predictive Insights for Schools',
      ar: 'برنامج تحليلات المدارس — رؤى تنبّؤية للمدارس',
    },
    metaDescription: {
      en: 'Go beyond reports with school analytics that surface at-risk students, enrollment trends and collection forecasts — turning data into early action.',
      ar: 'تجاوز التقارير مع تحليلات مدرسية تكشف الطلاب المعرّضين للخطر واتجاهات التسجيل وتوقّعات التحصيل، لتحويل البيانات إلى إجراء مبكر.',
    },
    keywords: {
      en: ['school analytics', 'predictive analytics education', 'student risk analytics'],
      ar: ['تحليلات المدارس', 'تحليلات تنبّؤية للتعليم'],
    },
    eyebrow: { en: 'Feature', ar: 'الميزة' },
    headline: { en: 'Analytics that drive early action', ar: 'تحليلات تقود إلى إجراء مبكر' },
    intro: {
      en: 'Munaxa’s analytics surface what matters — students at risk, enrollment momentum and collection forecasts — so leaders act early, not in hindsight.',
      ar: 'تكشف تحليلات Munaxa ما يهم — الطلاب المعرّضون للخطر وزخم التسجيل وتوقّعات التحصيل — ليتحرّك القادة مبكراً لا بعد فوات الأوان.',
    },
    highlights: [
      {
        icon: 'AlertTriangle',
        title: { en: 'At-risk detection', ar: 'كشف المعرّضين للخطر' },
        body: { en: 'Flag students before they fall behind.', ar: 'نبّه عن الطلاب قبل تأخّرهم.' },
      },
      {
        icon: 'TrendingUp',
        title: { en: 'Enrollment trends', ar: 'اتجاهات التسجيل' },
        body: { en: 'See momentum across the funnel.', ar: 'تابع الزخم عبر المسار.' },
      },
      {
        icon: 'LineChart',
        title: { en: 'Collection forecasts', ar: 'توقّعات التحصيل' },
        body: { en: 'Project cash flow with confidence.', ar: 'توقّع التدفّق النقدي بثقة.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Is analytics included?', ar: 'هل التحليلات مضمّنة؟' },
        answer: {
          en: 'Yes — analytics are built into every module, no separate tool needed.',
          ar: 'نعم، التحليلات مدمجة في كل وحدة دون أداة منفصلة.',
        },
      },
    ],
    related: { features: ['reporting', 'attendance', 'finance'] },
  },
];
