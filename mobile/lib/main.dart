import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'app.dart';
import 'core/di/injection.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Chargement des variables d'environnement depuis .env
  await dotenv.load(fileName: '.env');

  // Injection de dépendances
  await configureDependencies();

  runApp(const FleetApp());
}
