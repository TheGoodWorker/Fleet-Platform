import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class accidentsService {
  constructor(private prisma: PrismaService) {}
  // TODO Phase 3+: Implémenter la logique métier accidents
}
