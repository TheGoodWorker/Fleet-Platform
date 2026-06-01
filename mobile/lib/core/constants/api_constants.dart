/// Constantes des endpoints API Fleet Platform
/// Basé sur docs/swagger.json — 128 paths
class ApiConstants {
  ApiConstants._();

  // ─── Auth ────────────────────────────────────────────────────────────────
  static const String login = '/auth/login';
  static const String refresh = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String me = '/auth/me';

  // ─── Users ───────────────────────────────────────────────────────────────
  static const String users = '/users';
  static String userById(String id) => '/users/$id';
  static String userPassword(String id) => '/users/$id/password';
  static String userSuspend(String id) => '/users/$id/suspend';
  static String userActivate(String id) => '/users/$id/activate';

  // ─── Vehicles ────────────────────────────────────────────────────────────
  static const String vehicles = '/vehicles';
  static String vehicleById(String id) => '/vehicles/$id';
  static String vehicleStatus(String id) => '/vehicles/$id/status';
  static String vehicleAssignManager(String id) => '/vehicles/$id/assign-manager';

  // ─── Drivers ─────────────────────────────────────────────────────────────
  static const String drivers = '/drivers';
  static String driverById(String id) => '/drivers/$id';
  static String driverStatus(String id) => '/drivers/$id/status';
  static String driverValidateKyc(String id) => '/drivers/$id/validate-kyc';
  static String driverValidateField(String id) => '/drivers/$id/validate-field';

  // ─── Contracts ───────────────────────────────────────────────────────────
  static const String contracts = '/contracts';
  static String contractById(String id) => '/contracts/$id';

  // ─── Payments ────────────────────────────────────────────────────────────
  static const String payments = '/payments';
  static String paymentById(String id) => '/payments/$id';

  // ─── Notifications ───────────────────────────────────────────────────────
  static const String notifications = '/notifications';
  static const String notificationsMarkAllRead = '/notifications/mark-all-read';
  static const String notificationsUnreadCount = '/notifications/unread-count';
  static String notificationMarkRead(String id) => '/notifications/$id/read';

  // ─── Documents ───────────────────────────────────────────────────────────
  static const String documents = '/documents';
  static String documentById(String id) => '/documents/$id';

  // ─── Owner Portal ─────────────────────────────────────────────────────────
  static const String ownerDashboard = '/owner-portal/dashboard';
  static const String ownerSummary = '/owner-portal/summary';

  // ─── Pagination par défaut ────────────────────────────────────────────────
  static const int defaultPage = 1;
  static const int defaultLimit = 20;
  static const int maxLimit = 100;
}
