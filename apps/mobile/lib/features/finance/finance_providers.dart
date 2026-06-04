import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/finance/finance_api.dart';
import '../auth/auth_providers.dart';

final financeApiProvider = Provider<FinanceApi>((ref) => FinanceApi(ref.watch(dioProvider)));

/// A child's outstanding balance for the Parent app finance screen.
final statementTotalsProvider =
    FutureProvider.family<StatementTotals, String>((ref, studentId) async {
  return ref.watch(financeApiProvider).statementTotals(studentId);
});
