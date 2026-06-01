import 'package:equatable/equatable.dart';

import '../../../../shared/permissions/user_role.dart';

/// Entité User — couche domain
/// Indépendante de la couche data (pas de fromJson ici)
class User extends Equatable {
  const User({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.email,
    this.phone,
    this.avatarUrl,
  });

  final String id;
  final String firstName;
  final String lastName;
  final UserRole role;
  final String? email;
  final String? phone;
  final String? avatarUrl;

  String get fullName => '$firstName $lastName';

  String get displayName => fullName;

  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return '$f$l'.toUpperCase();
  }

  @override
  List<Object?> get props => [id, firstName, lastName, role, email, phone];
}
