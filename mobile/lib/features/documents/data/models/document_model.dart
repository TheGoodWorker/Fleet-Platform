import '../../domain/entities/document.dart';

class DocumentModel extends Document {
  const DocumentModel({
    required super.id,
    required super.entityType,
    required super.entityId,
    required super.type,
    required super.status,
    required super.alwaysValid,
    super.title,
    super.validFrom,
    super.validUntil,
    super.fileUrl,
  });

  factory DocumentModel.fromJson(Map<String, dynamic> json) {
    final validFromRaw = json['validFrom'] as String?;
    final validUntilRaw = json['validUntil'] as String?;

    return DocumentModel(
      id: json['id'] as String,
      entityType: json['entityType'] as String,
      entityId: json['entityId'] as String,
      type: DocumentType.fromString(json['type'] as String),
      title: json['title'] as String?,
      status: DocumentStatus.fromString(json['status'] as String),
      validFrom:
          validFromRaw != null ? DateTime.tryParse(validFromRaw) : null,
      validUntil:
          validUntilRaw != null ? DateTime.tryParse(validUntilRaw) : null,
      alwaysValid: json['alwaysValid'] as bool? ?? false,
      fileUrl: json['fileUrl'] as String?,
    );
  }
}
