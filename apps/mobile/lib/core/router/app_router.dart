import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/flavor.dart';

/// Foundation router. Auth-guarded routes, first-login redirect, and per-flavor
/// route trees are added in Phase 3+.
GoRouter createRouter() {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const _HomePlaceholder(),
      ),
    ],
  );
}

class _HomePlaceholder extends StatelessWidget {
  const _HomePlaceholder();

  @override
  Widget build(BuildContext context) {
    final config = AppConfig.instance;
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(config.appName, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 8),
            Text('Flavor: ${config.flavor.name}'),
            const SizedBox(height: 8),
            const Text('Phase 1 — Foundation ready'),
          ],
        ),
      ),
    );
  }
}
