import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../communication/notifications_providers.dart';
import '../shell/dashboard_widgets.dart';

/// Teacher home: a light landing with the notification feed and quick actions.
/// (Attendance capture is the offline-first flow in the attendance feature.)
class TeacherHomeScreen extends ConsumerWidget {
  const TeacherHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    final unread = ref.watch(unreadCountProvider);
    final feed = ref.watch(myNotificationsProvider);
    final roles = auth is AuthAuthenticated ? auth.principal.roles.join(', ') : '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Staff'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Sign out',
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(unreadCountProvider);
          ref.invalidate(myNotificationsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (roles.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text('Signed in as $roles',
                    style: Theme.of(context).textTheme.bodySmall),
              ),
            MetricCard(
              label: 'Unread notifications',
              value: unread.maybeWhen(data: (n) => '$n', orElse: () => '—'),
              icon: Icons.notifications,
            ),
            const SizedBox(height: 16),
            Text('Notifications', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            feed.when(
              loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
              error: (e, _) => AsyncSection(
                loading: false,
                error: e,
                onRetry: () => ref.invalidate(myNotificationsProvider),
                child: const SizedBox(),
              ),
              data: (items) {
                if (items.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No notifications.'),
                  );
                }
                return Column(
                  children: [
                    for (final n in items)
                      Card(
                        child: ListTile(
                          leading: Icon(
                            n.read ? Icons.mark_email_read : Icons.mark_email_unread,
                            color: n.read
                                ? Theme.of(context).colorScheme.onSurfaceVariant
                                : Theme.of(context).colorScheme.primary,
                          ),
                          title: Text(n.title),
                          subtitle: Text(n.body, maxLines: 2, overflow: TextOverflow.ellipsis),
                        ),
                      ),
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
