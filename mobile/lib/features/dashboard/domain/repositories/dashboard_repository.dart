import '../../presentation/cubit/dashboard_state.dart';

abstract class DashboardRepository {
  Future<DashboardData> load();
}
