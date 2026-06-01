import '../../../../shared/permissions/user_role.dart';
import '../../domain/entities/user.dart';

/// Modèle AuthResponseDto — correspondance directe avec le swagger
/// { accessToken, refreshToken, expiresIn, user: AuthUserDto }
class AuthResponseModel {
  const AuthResponseModel({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final String expiresIn;
  final AuthUserModel user;

  factory AuthResponseModel.fromJson(Map<String, dynamic> json) {
    return AuthResponseModel(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: json['expiresIn'] as String,
      user: AuthUserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}

/// Modèle AuthUserDto — profil minimal retourné lors de l'auth
class AuthUserModel {
  const AuthUserModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.email,
    this.phone,
  });

  final String id;
  final String firstName;
  final String lastName;
  final UserRole role;
  final String? email;
  final String? phone;

  factory AuthUserModel.fromJson(Map<String, dynamic> json) {
    return AuthUserModel(
      id: json['id'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      role: UserRole.fromString(json['role'] as String),
      email: json['email'] as String?,
      phone: json['phone'] as String?,
    );
  }

  /// Conversion vers l'entité domain
  User toEntity() => User(
        id: id,
        firstName: firstName,
        lastName: lastName,
        role: role,
        email: email,
        phone: phone,
      );
}
