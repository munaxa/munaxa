import 'package:dio/dio.dart';

import 'attendance_queue.dart';

/// HTTP access to the attendance endpoints. The bulk endpoint is idempotent on the server,
/// so retrying a previously-synced batch is safe.
class AttendanceApi {
  AttendanceApi(this._dio);

  final Dio _dio;

  /// Sync one (sectionId, date, periodIndex) batch of marks. Returns the count the server marked.
  Future<int> syncBatch({
    required String sectionId,
    required String date,
    required int periodIndex,
    required List<PendingMark> marks,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/attendance/students/bulk',
      data: {
        'sectionId': sectionId,
        'date': date,
        'periodIndex': periodIndex,
        'records': marks
            .map((m) => {
                  'studentId': m.studentId,
                  'status': m.status,
                  'method': m.method,
                  'clientRef': m.clientRef,
                })
            .toList(),
      },
    );
    return (res.data?['marked'] as num?)?.toInt() ?? 0;
  }

  Future<void> markByQr(String qrCode, {String? date, int periodIndex = 0}) async {
    await _dio.post<Map<String, dynamic>>(
      '/attendance/students/qr',
      data: {'qrCode': qrCode, if (date != null) 'date': date, 'periodIndex': periodIndex},
    );
  }
}
