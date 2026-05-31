import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class maintenanceService {
  constructor(private prisma: PrismaService) {}
  // TODO Phase 3+: Implémenter la logique métier maintenance
}
