import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../config/flavor.dart';
import '../../features/auth/login_screen.dart';

/// Foundation router. The full auth-guarded redirect (splash → login → home) is wired
/// alongside the per-flavor home shells (Phases 11/12); the login route is available now.
GoRouter createRouter() {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        builder: (context, state) => const _HomePlaceholder(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
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
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => context.push('/login'),
              child: const Text('Sign in'),
            ),
          ],
        ),
      ),
    );
  }
}
