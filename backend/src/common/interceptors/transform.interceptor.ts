import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        // Si le résultat est déjà formaté avec success/data, le passer tel quel
        if (result && typeof result === 'object' && 'success' in result && 'data' in result) {
          return result;
        }

        // Si le résultat contient data + meta (réponse paginée)
        if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
          return { success: true, ...result };
        }

        return { success: true, data: result };
      }),
    );
  }
}
