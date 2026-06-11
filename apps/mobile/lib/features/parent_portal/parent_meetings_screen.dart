import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../shell/dashboard_widgets.dart';
import 'parent_portal_providers.dart';

/// Parent–teacher meetings: book an open slot for the selected child, and manage bookings.
class ParentMeetingsTab extends ConsumerWidget {
  const ParentMeetingsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final slotsAsync = ref.watch(openPtmSlotsProvider);
    final bookingsAsync = ref.watch(ptmBookingsProvider);
    final selectedChild = ref.watch(selectedChildIdProvider);

    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(openPtmSlotsProvider);
        ref.invalidate(ptmBookingsProvider);
      },
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Your bookings', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          bookingsAsync.when(
            loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
            error: (e, _) => AsyncSection(
              loading: false,
              error: e,
              onRetry: () => ref.invalidate(ptmBookingsProvider),
              child: const SizedBox(),
            ),
            data: (bookings) {
              if (bookings.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('No bookings yet.'),
                );
              }
              return Column(
                children: [
                  for (final b in bookings)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.event),
                        title: Text('Booking · ${b.status}'),
                        subtitle: Text('Slot ${b.slotId}', maxLines: 1, overflow: TextOverflow.ellipsis),
                        trailing: b.status != 'CANCELLED'
                            ? TextButton(
                                onPressed: () async {
                                  await ref.read(parentPortalApiProvider).cancelBooking(b.id);
                                  ref.invalidate(ptmBookingsProvider);
                                  ref.invalidate(openPtmSlotsProvider);
                                },
                                child: const Text('Cancel'),
                              )
                            : null,
                      ),
                    ),
                ],
              );
            },
          ),
          const SizedBox(height: 24),
          Text('Open slots', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          slotsAsync.when(
            loading: () => const AsyncSection(loading: true, error: null, child: SizedBox()),
            error: (e, _) => AsyncSection(
              loading: false,
              error: e,
              onRetry: () => ref.invalidate(openPtmSlotsProvider),
              child: const SizedBox(),
            ),
            data: (slots) {
              if (slots.isEmpty) {
                return const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Text('No open slots right now.'),
                );
              }
              return Column(
                children: [
                  for (final s in slots)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.schedule),
                        title: Text('${s.startsAt} → ${s.endsAt}'),
                        subtitle: Text(s.location ?? 'Location TBD'),
                        trailing: FilledButton(
                          onPressed: selectedChild == null
                              ? null
                              : () async {
                                  final messenger = ScaffoldMessenger.of(context);
                                  try {
                                    await ref.read(parentPortalApiProvider).bookSlot(
                                          slotId: s.id,
                                          studentId: selectedChild,
                                        );
                                    ref.invalidate(ptmBookingsProvider);
                                    ref.invalidate(openPtmSlotsProvider);
                                  } catch (_) {
                                    messenger.showSnackBar(
                                      const SnackBar(content: Text('Could not book this slot.')),
                                    );
                                  }
                                },
                          child: const Text('Book'),
                        ),
                      ),
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
