/// Phase 8-E — Régression parsing liste vide
///
/// Vérifie que chaque datasource retourne [] (et non une exception) quand
/// l'API renvoie { "success": true, "data": [], "meta": {...} } avec 200 OK.
///
/// Teste aussi :
/// - body String JSON non décodé (edge-case Flutter Web)
/// - DioException wrappant une ApiException → throw ApiException (pas DioException)
/// - 401 explicite → UnauthorizedException
library;

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:fleet_mobile/core/api/api_exception.dart';
import 'package:fleet_mobile/features/vehicles/data/datasources/vehicle_remote_datasource.dart';
import 'package:fleet_mobile/features/drivers/data/datasources/driver_remote_datasource.dart';
import 'package:fleet_mobile/features/contracts/data/datasources/contract_remote_datasource.dart';
import 'package:fleet_mobile/features/payments/data/datasources/payment_remote_datasource.dart';
import 'package:fleet_mobile/features/documents/data/datasources/document_remote_datasource.dart';

class MockDio extends Mock implements Dio {}

/// Crée une réponse 200 OK avec body Map déjà décodé.
Response<dynamic> _okResponse(List<dynamic> items) => Response<dynamic>(
      data: {
        'success': true,
        'data': items,
        'meta': {'page': 1, 'limit': 50, 'total': items.length},
      },
      statusCode: 200,
      requestOptions: RequestOptions(path: ''),
    );

/// Crée une réponse 200 OK avec body String JSON (Flutter Web edge-case).
Response<dynamic> _okStringResponse(List<dynamic> items) => Response<dynamic>(
      data:
          '{"success":true,"data":${items.isEmpty ? '[]' : '[$items]'},"meta":{"page":1,"limit":50,"total":${items.length}}}',
      statusCode: 200,
      requestOptions: RequestOptions(path: ''),
    );

/// Crée une réponse 401.
Response<dynamic> _unauthorizedResponse() => Response<dynamic>(
      data: {'message': 'Unauthorized', 'statusCode': 401},
      statusCode: 401,
      requestOptions: RequestOptions(path: ''),
    );

void main() {
  late MockDio mockDio;

  setUp(() {
    mockDio = MockDio();
    registerFallbackValue(RequestOptions(path: ''));
  });

  // ─── Vehicles ──────────────────────────────────────────────────────────────

  group('vehicles empty data returns empty list', () {
    late VehicleRemoteDataSourceImpl ds;
    setUp(() => ds = VehicleRemoteDataSourceImpl(mockDio));

    test('data:[] Map → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okResponse([]));

      expect(await ds.getVehicles(), isEmpty);
    });

    test('data:[] String JSON → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okStringResponse([]));

      expect(await ds.getVehicles(), isEmpty);
    });

    test('401 → UnauthorizedException', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _unauthorizedResponse());

      expect(ds.getVehicles(), throwsA(isA<UnauthorizedException>()));
    });

    test('DioException wrappant ForbiddenException → throw ForbiddenException', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenThrow(DioException(
        requestOptions: RequestOptions(path: ''),
        error: const ForbiddenException(),
      ));

      expect(ds.getVehicles(), throwsA(isA<ForbiddenException>()));
    });
  });

  // ─── Drivers ───────────────────────────────────────────────────────────────

  group('drivers empty data returns empty list', () {
    late DriverRemoteDataSourceImpl ds;
    setUp(() => ds = DriverRemoteDataSourceImpl(mockDio));

    test('data:[] Map → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okResponse([]));

      expect(await ds.getDrivers(), isEmpty);
    });

    test('data:[] String JSON → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okStringResponse([]));

      expect(await ds.getDrivers(), isEmpty);
    });

    test('401 → UnauthorizedException', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _unauthorizedResponse());

      expect(ds.getDrivers(), throwsA(isA<UnauthorizedException>()));
    });
  });

  // ─── Contracts ─────────────────────────────────────────────────────────────

  group('contracts empty data returns empty list', () {
    late ContractRemoteDataSourceImpl ds;
    setUp(() => ds = ContractRemoteDataSourceImpl(mockDio));

    test('data:[] Map → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okResponse([]));

      expect(await ds.getContracts(), isEmpty);
    });

    test('data:[] String JSON → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okStringResponse([]));

      expect(await ds.getContracts(), isEmpty);
    });

    test('403 → ForbiddenException', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => Response<dynamic>(
            data: {'message': 'Forbidden', 'statusCode': 403},
            statusCode: 403,
            requestOptions: RequestOptions(path: ''),
          ));

      expect(ds.getContracts(), throwsA(isA<ForbiddenException>()));
    });
  });

  // ─── Payments ──────────────────────────────────────────────────────────────

  group('payments empty data returns empty list', () {
    late PaymentRemoteDataSourceImpl ds;
    setUp(() => ds = PaymentRemoteDataSourceImpl(mockDio));

    test('data:[] Map → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okResponse([]));

      expect(await ds.getPayments(), isEmpty);
    });

    test('data:[] String JSON → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okStringResponse([]));

      expect(await ds.getPayments(), isEmpty);
    });

    test('401 → UnauthorizedException', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _unauthorizedResponse());

      expect(ds.getPayments(), throwsA(isA<UnauthorizedException>()));
    });
  });

  // ─── Documents ─────────────────────────────────────────────────────────────

  group('documents empty data returns empty list', () {
    late DocumentRemoteDataSourceImpl ds;
    setUp(() => ds = DocumentRemoteDataSourceImpl(mockDio));

    test('data:[] Map → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okResponse([]));

      expect(await ds.getDocuments(), isEmpty);
    });

    test('data:[] String JSON → retourne []', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _okStringResponse([]));

      expect(await ds.getDocuments(), isEmpty);
    });

    test('401 → UnauthorizedException', () async {
      when(() => mockDio.get<dynamic>(
            any(),
            queryParameters: any(named: 'queryParameters'),
          )).thenAnswer((_) async => _unauthorizedResponse());

      expect(ds.getDocuments(), throwsA(isA<UnauthorizedException>()));
    });
  });
}
