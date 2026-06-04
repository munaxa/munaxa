import 'dart:typed_data';

import 'package:dio/dio.dart';

class StatementTotals {
  const StatementTotals({required this.charged, required this.paid, required this.outstanding});
  final String charged;
  final String paid;
  final String outstanding;

  factory StatementTotals.fromJson(Map<String, dynamic> json) => StatementTotals(
        charged: json['charged'] as String,
        paid: json['paid'] as String,
        outstanding: json['outstanding'] as String,
      );
}

/// Parent-app finance access: view a child's statement and upload a CliQ/e-wallet receipt.
class FinanceApi {
  FinanceApi(this._dio);

  final Dio _dio;

  Future<StatementTotals> statementTotals(String studentId) async {
    final res = await _dio.get<Map<String, dynamic>>('/finance/students/$studentId/statement');
    return StatementTotals.fromJson(res.data!['totals'] as Map<String, dynamic>);
  }

  /// Full receipt flow: presign → PUT bytes to S3 → record a PENDING transaction.
  Future<void> uploadReceiptAndPay({
    required String studentId,
    required double amount,
    required String method, // CLIQ | EWALLET
    required String fileName,
    required String contentType,
    required Uint8List bytes,
    String? reference,
  }) async {
    final presign = await _dio.post<Map<String, dynamic>>(
      '/finance/transactions/receipt/presign',
      data: {'fileName': fileName, 'contentType': contentType, 'size': bytes.length},
    );
    final uploadUrl = presign.data!['uploadUrl'] as String;
    final fileKey = presign.data!['fileKey'] as String;

    // Upload the file bytes directly to S3 with the pre-signed URL (no auth header).
    await Dio().put<void>(
      uploadUrl,
      data: Stream.fromIterable([bytes]),
      options: Options(headers: {'Content-Type': contentType}),
    );

    await _dio.post<Map<String, dynamic>>('/finance/transactions', data: {
      'studentId': studentId,
      'amount': amount,
      'method': method,
      'receiptKey': fileKey,
      if (reference != null) 'reference': reference,
    });
  }
}
