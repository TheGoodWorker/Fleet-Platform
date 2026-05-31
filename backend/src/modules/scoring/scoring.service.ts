import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ScoringService {
  constructor(private prisma: PrismaService) {}
  // TODO Phase 4: Implémenter la logique métier scoring
}
