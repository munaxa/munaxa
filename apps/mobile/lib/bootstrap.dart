import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/config/flavor.dart';
import 'core/push/push_service.dart';

/// Shared bootstrap for all flavors. Initializes config + Riverpod scope, and best-effort
/// Firebase/FCM (a no-op when Firebase isn't configured for the build).
Future<void> bootstrap(AppConfig config) async {
  WidgetsFlutterBinding.ensureInitialized();
  AppConfig.init(config);
  await PushService.instance.initFirebase();

  runApp(
    const ProviderScope(
      child: MunaxaApp(),
    ),
  );
}
