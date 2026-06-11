import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../shell/dashboard_widgets.dart';
import 'parent_portal_providers.dart';

/// The parent dashboard tab: KPI metrics for the currently selected child.
/// The child switcher and app bar live in [ParentShell].
class ParentDashboardTab extends ConsumerWidget {
  const ParentDashboardTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final dashAsync = ref.watch(childDashboardProvider);
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(childrenProvider);
        ref.invalidate(childDashboardProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          dashAsync.when(
            loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
            error: (e, _) => AsyncSection(
              loading: false,
              error: e,
              onRetry: () => ref.invalidate(childDashboardProvider),
              child: const SizedBox(),
            ),
            data: (dash) {
              if (dash == null) {
                return const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('No children are linked to your account yet.'),
                );
              }
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
          ),
        ],
      ),
    );
  }
}
