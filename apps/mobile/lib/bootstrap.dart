import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/config/flavor.dart';

/// Shared bootstrap for all flavors. Initializes config + Riverpod scope.
/// Firebase, Sentry, and FCM initialization are wired in Phase 3 / 10.
Future<void> bootstrap(AppConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();
  AppConfig.init(config);

  runApp(
    const ProviderScope(
      child: MunaxaApp(),
    ),
  );
}
