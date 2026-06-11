export interface FaqItem {
  question: string;
  answer: string;
}

/** Shared FAQ content — rendered on the page and reused for FAQPage structured data. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'Is Munaxa a Learning Management System (LMS)?',
    answer:
      'No. Munaxa is a School Operating System focused on school administration — students, attendance, academics, finance, communication, and more. It complements your existing LMS (such as Google Classroom or Microsoft Teams) rather than replacing it.',
  },
  {
    question: 'Can Munaxa support multiple campuses or a group of schools?',
    answer:
      'Yes. Munaxa is built for single schools as well as multi-campus networks and educational groups, giving owners and directors a consolidated view across every location.',
  },
  {
    question: 'Does Munaxa support Arabic and English?',
    answer:
      'Yes. Munaxa is bilingual by design, with full support for Arabic (right-to-left) and English (left-to-right) interfaces.',
  },
  {
    question: 'How secure is our school data?',
    answer:
      'Munaxa is built on enterprise-grade security practices, including data isolation between schools, encrypted communications, and role-based access control, so the right people see the right information.',
  },
  {
    question: 'How long does onboarding take?',
    answer:
      'Most schools can be onboarded within a few weeks, depending on the size of the institution and the modules selected. Our team works with you to plan a smooth rollout.',
  },
  {
    question: 'Can we migrate from spreadsheets or another system?',
    answer:
      'Yes. Our onboarding team helps you migrate existing student, staff, and academic data so you can get started without losing historical records.',
  },
  {
    question: 'Is there an app for parents and students?',
    answer:
      'Yes. Parents and students can stay connected through dedicated mobile experiences for attendance, announcements, academic updates, and more.',
  },
  {
    question: 'How is Munaxa priced?',
    answer:
      'Pricing is tailored to your school size, number of campuses, and selected modules. Contact our team for a customized quote.',
  },
];
