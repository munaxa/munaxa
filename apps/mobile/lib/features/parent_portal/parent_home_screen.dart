import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../auth/auth_controller.dart';
import '../shell/dashboard_widgets.dart';
import 'parent_portal_providers.dart';
import '../../data/parent_portal/parent_portal_api.dart';

/// Parent home: a multi-child switcher plus the selected child's dashboard.
class ParentHomeScreen extends ConsumerWidget {
  const ParentHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final childrenAsync = ref.watch(childrenProvider);
    final selectedId = ref.watch(selectedChildIdProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
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
          ref.invalidate(childrenProvider);
          ref.invalidate(childDashboardProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            childrenAsync.when(
              loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
              error: (e, _) => AsyncSection(
                loading: false,
                error: e,
                onRetry: () => ref.invalidate(childrenProvider),
                child: const SizedBox(),
              ),
              data: (children) {
                if (children.isEmpty) {
                  return const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text('No children are linked to your account yet.'),
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _ChildSwitcher(
                      children: children,
                      selectedId: selectedId,
                      onChanged: (id) =>
                          ref.read(selectedChildIdProvider.notifier).state = id,
                    ),
                    const SizedBox(height: 16),
                    const _ChildDashboard(),
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

class _ChildSwitcher extends StatelessWidget {
  const _ChildSwitcher({
    required this.children,
    required this.selectedId,
    required this.onChanged,
  });

  final List<ChildSummary> children;
  final String? selectedId;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    if (children.length == 1) {
      return Text(
        children.first.fullNameEn,
        style: Theme.of(context).textTheme.titleLarge,
      );
    }
    return DropdownButtonFormField<String>(
      value: selectedId,
      decoration: const InputDecoration(labelText: 'Child', border: OutlineInputBorder()),
      items: [
        for (final c in children)
          DropdownMenuItem(value: c.studentId, child: Text(c.fullNameEn)),
      ],
      onChanged: (v) {
        if (v != null) onChanged(v);
      },
    );
  }
}

class _ChildDashboard extends ConsumerWidget {
  const _ChildDashboard();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(childDashboardProvider);
    return dashAsync.when(
      loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
      error: (e, _) => AsyncSection(
        loading: false,
        error: e,
        onRetry: () => ref.invalidate(childDashboardProvider),
        child: const SizedBox(),
      ),
      data: (dash) {
        if (dash == null) return const SizedBox();
        final rate = attendanceRate(dash.attendanceLast30Days);
        return GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 12,
          crossAxisSpacing: 12,
          childAspectRatio: 1.5,
          children: [
            MetricCard(
              label: 'Attendance (30d)',
              value: rate != null ? '$rate%' : '—',
              icon: Icons.event_available,
            ),
            MetricCard(
              label: 'Upcoming homework',
              value: '${dash.upcomingHomework}',
              icon: Icons.menu_book,
            ),
            MetricCard(
              label: 'Outstanding',
              value: dash.outstandingBalance,
              icon: Icons.account_balance_wallet,
            ),
            MetricCard(
              label: 'Unread',
              value: '${dash.unreadNotifications}',
              icon: Icons.notifications,
            ),
            MetricCard(
              label: 'Pending leave',
              value: '${dash.pendingLeaveRequests}',
              icon: Icons.beach_access,
            ),
            MetricCard(
              label: 'PTM bookings',
              value: '${dash.upcomingPtmBookings}',
              icon: Icons.groups,
            ),
          ],
        );
      },
    );
  }
}
