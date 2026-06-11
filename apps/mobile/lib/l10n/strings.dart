import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/settings/locale_controller.dart';

/// Lightweight bilingual string catalog (en/ar), looked up by key. Mirrors the web app's
/// `@munaxa/i18n` t() approach without Flutter codegen, so it is fully analyzable here and
/// switches live with [localeProvider]. Falls back to English, then the key itself.
class AppStrings {
  const AppStrings(this.lang);

  final String lang;

  String t(String key) {
    final entry = _catalog[key];
    if (entry == null) return key;
    return entry[lang] ?? entry['en'] ?? key;
  }
}

/// Active strings for the current locale. `final s = ref.watch(stringsProvider); s.t('auth.signIn')`.
final stringsProvider = Provider<AppStrings>((ref) {
  return AppStrings(ref.watch(localeProvider).languageCode);
});

const Map<String, Map<String, String>> _catalog = {
  // Common chrome
  'common.signOut': {'en': 'Sign out', 'ar': 'تسجيل الخروج'},
  'common.retry': {'en': 'Retry', 'ar': 'إعادة المحاولة'},
  'common.loadError': {'en': 'Could not load this content.', 'ar': 'تعذّر تحميل المحتوى.'},
  'common.english': {'en': 'English', 'ar': 'الإنجليزية'},
  'common.arabic': {'en': 'Arabic', 'ar': 'العربية'},
  'common.syncNow': {'en': 'Sync now', 'ar': 'مزامنة الآن'},

  // Auth — login
  'auth.brand': {'en': 'Munaxa', 'ar': 'منَخَة'},
  'auth.schoolOptional': {'en': 'School (optional)', 'ar': 'المدرسة (اختياري)'},
  'auth.identifier': {'en': 'Email or username', 'ar': 'البريد الإلكتروني أو اسم المستخدم'},
  'auth.password': {'en': 'Password', 'ar': 'كلمة المرور'},
  'auth.identifierRequired': {
    'en': 'Enter your email or username',
    'ar': 'أدخل بريدك الإلكتروني أو اسم المستخدم'
  },
  'auth.passwordRequired': {'en': 'Enter your password', 'ar': 'أدخل كلمة المرور'},
  'auth.signIn': {'en': 'Sign in', 'ar': 'تسجيل الدخول'},
  'auth.signingIn': {'en': 'Signing in…', 'ar': 'جارٍ تسجيل الدخول…'},
  'auth.signInFailed': {
    'en': 'Sign in failed. Check your credentials.',
    'ar': 'فشل تسجيل الدخول. تحقّق من بياناتك.'
  },

  // Auth — change password
  'auth.setNewPassword': {'en': 'Set a new password', 'ar': 'تعيين كلمة مرور جديدة'},
  'auth.chooseNewPassword': {'en': 'Choose a new password', 'ar': 'اختر كلمة مرور جديدة'},
  'auth.tempPasswordHint': {
    'en': 'Your account uses a temporary password. Set your own to continue.',
    'ar': 'يستخدم حسابك كلمة مرور مؤقتة. عيّن كلمتك للمتابعة.'
  },
  'auth.currentPassword': {
    'en': 'Current (temporary) password',
    'ar': 'كلمة المرور الحالية (المؤقتة)'
  },
  'auth.newPassword': {'en': 'New password', 'ar': 'كلمة المرور الجديدة'},
  'auth.currentPasswordRequired': {
    'en': 'Enter the current password',
    'ar': 'أدخل كلمة المرور الحالية'
  },
  'auth.passwordRule': {
    'en': 'At least 10 characters, with upper, lower and a digit',
    'ar': '10 أحرف على الأقل، مع حرف كبير وصغير ورقم'
  },
  'auth.savePassword': {'en': 'Save password', 'ar': 'حفظ كلمة المرور'},
  'auth.saving': {'en': 'Saving…', 'ar': 'جارٍ الحفظ…'},
  'auth.changePasswordFailed': {
    'en': 'Could not change the password. Check the current one and try again.',
    'ar': 'تعذّر تغيير كلمة المرور. تحقّق من الحالية وحاول مجددًا.'
  },

  // Parent tabs
  'parent.tab.home': {'en': 'Home', 'ar': 'الرئيسية'},
  'parent.tab.requests': {'en': 'Requests', 'ar': 'الطلبات'},
  'parent.tab.meetings': {'en': 'Meetings', 'ar': 'الاجتماعات'},
  'parent.tab.documents': {'en': 'Documents', 'ar': 'المستندات'},
  'parent.tab.grades': {'en': 'Grades', 'ar': 'الدرجات'},

  // Student tabs
  'student.tab.home': {'en': 'My day', 'ar': 'يومي'},
  'student.tab.timetable': {'en': 'Timetable', 'ar': 'الجدول'},
  'student.tab.homework': {'en': 'Homework', 'ar': 'الواجبات'},
  'student.tab.resources': {'en': 'Resources', 'ar': 'المصادر'},
  'student.tab.grades': {'en': 'Grades', 'ar': 'الدرجات'},

  // Grades view
  'grades.overall': {'en': 'Overall', 'ar': 'المعدل العام'},
  'grades.subjects': {'en': 'Subjects', 'ar': 'المواد'},
  'grades.empty': {'en': 'No grades recorded yet.', 'ar': 'لا توجد درجات مسجّلة بعد.'},
  'grades.assessments': {'en': 'assessments', 'ar': 'تقييم'},
  'grades.selectChild': {'en': 'Select a child to view grades.', 'ar': 'اختر طفلًا لعرض الدرجات.'},

  // Teacher tabs
  'teacher.tab.class': {'en': 'My class', 'ar': 'صفّي'},
  'teacher.tab.notifications': {'en': 'Notifications', 'ar': 'الإشعارات'},
  'teacher.tab.account': {'en': 'Account', 'ar': 'الحساب'},
};
