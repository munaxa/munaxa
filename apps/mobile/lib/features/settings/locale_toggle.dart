import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'locale_controller.dart';

/// App-bar button to switch between English and Arabic (RTL).
class LocaleToggleButton extends ConsumerWidget {
  const LocaleToggleButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isAr = ref.watch(localeProvider).languageCode == 'ar';
    return IconButton(
      tooltip: isAr ? 'English' : 'العربية',
      onPressed: () => ref.read(localeProvider.notifier).toggle(),
      icon: Text(
        isAr ? 'EN' : 'ع',
        style: const TextStyle(fontWeight: FontWeight.bold),
      ),
    );
  }
}
