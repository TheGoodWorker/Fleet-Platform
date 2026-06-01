/// Enveloppe standard des réponses API Fleet Platform
/// Format : { statusCode, message, data }
class ApiResponse<T> {
  final int statusCode;
  final String message;
  final T? data;

  const ApiResponse({
    required this.statusCode,
    required this.message,
    this.data,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic) fromJsonT,
  ) {
    return ApiResponse<T>(
      statusCode: json['statusCode'] as int? ?? 200,
      message: json['message'] as String? ?? 'OK',
      data: json['data'] != null ? fromJsonT(json['data']) : null,
    );
  }

  bool get isSuccess => statusCode >= 200 && statusCode < 300;
}

/// Enveloppe de réponse sans data typée (message only)
typedef MessageResponse = ApiResponse<void>;
