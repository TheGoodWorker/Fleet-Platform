import '../entities/document.dart';

abstract class DocumentRepository {
  Future<List<Document>> getDocuments({
    String? status,
    String? entityType,
    String? entityId,
    int page = 1,
    int limit = 20,
  });
}
