import type { ContentPage } from './types';

/** Integration pages → /integrations/[slug]. */
export const integrations: ContentPage[] = [
  {
    kind: 'integration',
    slug: 'jofotara',
    icon: 'BadgeCheck',
    name: { en: 'JoFotara', ar: 'JoFotara' },
    seoTitle: {
      en: 'Munaxa + JoFotara Integration — Jordan E-Invoicing for Schools',
      ar: 'تكامل Munaxa مع JoFotara — الفوترة الإلكترونية للمدارس في الأردن',
    },
    metaDescription: {
      en: 'Connect Munaxa to Jordan’s JoFotara national e-invoicing system. School fee invoices are submitted automatically and stay fully compliant.',
      ar: 'اربط Munaxa بنظام الفوترة الوطني JoFotara في الأردن. تُرسل فواتير رسوم المدارس تلقائياً وتبقى متوافقة بالكامل.',
    },
    keywords: {
      en: ['JoFotara integration', 'Jordan e-invoicing', 'JoFotara schools'],
      ar: ['تكامل JoFotara', 'الفوترة الإلكترونية الأردن'],
    },
    eyebrow: { en: 'Integration', ar: 'تكامل' },
    headline: { en: 'Munaxa + JoFotara', ar: 'Munaxa + JoFotara' },
    intro: {
      en: 'Munaxa integrates natively with Jordan’s JoFotara national e-invoicing platform, submitting compliant school fee invoices automatically.',
      ar: 'تتكامل Munaxa أصيلاً مع منصة الفوترة الوطنية JoFotara في الأردن، وتُرسل فواتير رسوم المدارس المتوافقة تلقائياً.',
    },
    highlights: [
      {
        icon: 'Zap',
        title: { en: 'Automatic', ar: 'تلقائي' },
        body: {
          en: 'Invoices submit without manual export.',
          ar: 'تُرسل الفواتير دون تصدير يدوي.',
        },
      },
      {
        icon: 'ShieldCheck',
        title: { en: 'Compliant', ar: 'متوافق' },
        body: { en: 'Meets Jordan’s e-invoicing mandate.', ar: 'يلبّي إلزام الفوترة في الأردن.' },
      },
      {
        icon: 'FileCheck2',
        title: { en: 'Audit-ready', ar: 'جاهز للتدقيق' },
        body: { en: 'Every submission logged.', ar: 'كل إرسال موثّق.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Is JoFotara integration included?', ar: 'هل تكامل JoFotara مضمّن؟' },
        answer: {
          en: 'Yes — JoFotara e-invoicing is built into Munaxa’s finance module for Jordan.',
          ar: 'نعم، فوترة JoFotara مدمجة في وحدة المالية في Munaxa للأردن.',
        },
      },
    ],
    related: { features: ['finance', 'jofotara', 'einvoicing'], countries: ['jordan'] },
  },
  {
    kind: 'integration',
    slug: 'google-classroom',
    icon: 'GraduationCap',
    name: { en: 'Google Classroom', ar: 'Google Classroom' },
    seoTitle: {
      en: 'Munaxa + Google Classroom Integration for Schools',
      ar: 'تكامل Munaxa مع Google Classroom للمدارس',
    },
    metaDescription: {
      en: 'Sync rosters, classes and assignments between Munaxa and Google Classroom — one source of truth for student data, no double entry.',
      ar: 'زامن القوائم والصفوف والواجبات بين Munaxa وGoogle Classroom — مصدر واحد لبيانات الطلاب دون إدخال مزدوج.',
    },
    keywords: {
      en: ['Google Classroom integration', 'school roster sync', 'Google for Education'],
      ar: ['تكامل Google Classroom', 'مزامنة قوائم الطلاب'],
    },
    eyebrow: { en: 'Integration', ar: 'تكامل' },
    headline: { en: 'Munaxa + Google Classroom', ar: 'Munaxa + Google Classroom' },
    intro: {
      en: 'Keep Munaxa and Google Classroom in sync — rosters, classes and assignments flow automatically so teachers never re-enter data.',
      ar: 'حافظ على تزامن Munaxa وGoogle Classroom — تنتقل القوائم والصفوف والواجبات تلقائياً فلا يعيد المعلّمون إدخال البيانات.',
    },
    highlights: [
      {
        icon: 'RefreshCw',
        title: { en: 'Roster sync', ar: 'مزامنة القوائم' },
        body: { en: 'Classes and students stay aligned.', ar: 'تبقى الصفوف والطلاب متطابقة.' },
      },
      {
        icon: 'BookOpen',
        title: { en: 'Assignment flow', ar: 'تدفّق الواجبات' },
        body: {
          en: 'Coursework connects to the gradebook.',
          ar: 'يرتبط العمل الدراسي بسجل الدرجات.',
        },
      },
      {
        icon: 'Link',
        title: { en: 'Single source of truth', ar: 'مصدر واحد موثوق' },
        body: { en: 'No duplicate student records.', ar: 'لا سجلات طلاب مكررة.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Does it sync grades?', ar: 'هل يزامن الدرجات؟' },
        answer: {
          en: 'Yes — assignment results can flow back into the Munaxa gradebook.',
          ar: 'نعم، يمكن أن تنتقل نتائج الواجبات إلى سجل درجات Munaxa.',
        },
      },
    ],
    related: { features: ['academics', 'student-app'], solutions: ['international-schools'] },
  },
  {
    kind: 'integration',
    slug: 'microsoft-teams',
    icon: 'MessageSquare',
    name: { en: 'Microsoft Teams', ar: 'Microsoft Teams' },
    seoTitle: {
      en: 'Munaxa + Microsoft Teams Integration for Schools',
      ar: 'تكامل Munaxa مع Microsoft Teams للمدارس',
    },
    metaDescription: {
      en: 'Connect Munaxa with Microsoft Teams for Education — sync classes and bring school data into the tools staff and students already use.',
      ar: 'اربط Munaxa مع Microsoft Teams للتعليم — زامن الصفوف وأحضر بيانات المدرسة إلى الأدوات التي يستخدمها الموظفون والطلاب أصلاً.',
    },
    keywords: {
      en: ['Microsoft Teams integration', 'Teams for Education', 'school Teams sync'],
      ar: ['تكامل Microsoft Teams', 'Teams للتعليم'],
    },
    eyebrow: { en: 'Integration', ar: 'تكامل' },
    headline: { en: 'Munaxa + Microsoft Teams', ar: 'Munaxa + Microsoft Teams' },
    intro: {
      en: 'Bring Munaxa’s class and roster data into Microsoft Teams for Education, so collaboration and school records stay perfectly aligned.',
      ar: 'أحضر بيانات الصفوف والقوائم من Munaxa إلى Microsoft Teams للتعليم، ليبقى التعاون وسجلات المدرسة متطابقين.',
    },
    highlights: [
      {
        icon: 'RefreshCw',
        title: { en: 'Class sync', ar: 'مزامنة الصفوف' },
        body: {
          en: 'Teams stay aligned with school classes.',
          ar: 'تبقى فرق Teams متطابقة مع صفوف المدرسة.',
        },
      },
      {
        icon: 'Users',
        title: { en: 'Roster aware', ar: 'مدرك للقوائم' },
        body: { en: 'Memberships follow enrollment.', ar: 'تتبع العضويات التسجيل.' },
      },
      {
        icon: 'Link',
        title: { en: 'Unified data', ar: 'بيانات موحّدة' },
        body: { en: 'No re-entering students.', ar: 'لا إعادة إدخال للطلاب.' },
      },
    ],
    faqs: [
      {
        question: { en: 'Does it support Teams for Education?', ar: 'هل يدعم Teams للتعليم؟' },
        answer: {
          en: 'Yes — Munaxa aligns classes and rosters with Microsoft Teams for Education.',
          ar: 'نعم، توائم Munaxa الصفوف والقوائم مع Microsoft Teams للتعليم.',
        },
      },
    ],
    related: { features: ['academics', 'communication'] },
  },
];
