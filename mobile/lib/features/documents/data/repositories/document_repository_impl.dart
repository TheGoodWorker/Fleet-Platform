import '../../domain/entities/document.dart';
import '../../domain/repositories/document_repository.dart';
import '../datasources/document_remote_datasource.dart';

class DocumentRepositoryImpl implements DocumentRepository {
  const DocumentRepositoryImpl(this._remote);

  final DocumentRemoteDataSource _remote;

  @override
  Future<List<Document>> getDocuments({
    String? status,
    String? entityType,
    String? entityId,
    int page = 1,
    int limit = 20,
  }) async {
    return _remote.getDocuments(
      status: status,
      entityType: entityType,
      entityId: entityId,
      page: page,
      limit: limit,
    );
  }
}
