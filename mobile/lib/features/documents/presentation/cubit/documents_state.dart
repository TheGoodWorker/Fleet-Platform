import 'package:equatable/equatable.dart';

import '../../domain/entities/document.dart';

sealed class DocumentsState extends Equatable {
  const DocumentsState();
}

class DocumentsInitial extends DocumentsState {
  const DocumentsInitial();

  @override
  List<Object?> get props => [];
}

class DocumentsLoading extends DocumentsState {
  const DocumentsLoading();

  @override
  List<Object?> get props => [];
}

class DocumentsLoaded extends DocumentsState {
  const DocumentsLoaded({
    required this.documents,
    this.statusFilter,
  });

  final List<Document> documents;
  final String? statusFilter;

  @override
  List<Object?> get props => [documents, statusFilter];
}

class DocumentsError extends DocumentsState {
  const DocumentsError(this.message);

  final String message;

  @override
  List<Object?> get props => [message];
}
