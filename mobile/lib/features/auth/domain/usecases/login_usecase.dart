import '../entities/user.dart';
import '../repositories/auth_repository.dart';

class LoginParams {
  const LoginParams({
    this.email,
    this.phone,
    required this.password,
  }) : assert(
          email != null || phone != null,
          'email ou phone est obligatoire',
        );

  final String? email;
  final String? phone;
  final String password;
}

class LoginUseCase {
  const LoginUseCase(this._repository);

  final AuthRepository _repository;

  Future<User> call(LoginParams params) {
    return _repository.login(
      email: params.email,
      phone: params.phone,
      password: params.password,
    );
  }
}
