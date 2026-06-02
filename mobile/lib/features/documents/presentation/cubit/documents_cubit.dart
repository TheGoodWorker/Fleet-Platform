import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/api/api_exception.dart';
import '../../domain/repositories/document_repository.dart';
import 'documents_state.dart';

class DocumentsCubit extends Cubit<DocumentsState> {
  DocumentsCubit(this._repository) : super(const DocumentsInitial());

  final DocumentRepository _repository;

  Future<void> load({String? status}) async {
    emit(const DocumentsLoading());
    try {
      final list = await _repository.getDocuments(
        status: status,
        page: 1,
        limit: 50,
      );
      emit(DocumentsLoaded(documents: list, statusFilter: status));
    } on ApiException catch (e) {
      emit(DocumentsError(e.message));
    } catch (e) {
      emit(DocumentsError(e.toString()));
    }
  }

  Future<void> refresh() async {
    final currentFilter = state is DocumentsLoaded
        ? (state as DocumentsLoaded).statusFilter
        : null;
    await load(status: currentFilter);
  }

  void filterByStatus(String? status) {
    load(status: status);
  }
}
