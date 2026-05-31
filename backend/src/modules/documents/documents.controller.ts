import {
  Controller, Get, Post, Patch, Param, Query, Body,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DocumentEntityType, DocumentType, UserRole, User } from '@prisma/client';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto, DocumentFiltersDto } from './dto/document.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('documents')
@ApiBearerAuth('JWT')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les documents (filtrés par entité, type, statut)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: DocumentFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(filters, page, limit);
  }

  @Get('entity/:entityType/:entityId')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Dernières versions des documents pour une entité' })
  findLatestForEntity(
    @Param('entityType') entityType: DocumentEntityType,
    @Param('entityId') entityId: string,
    @Query('type') type?: DocumentType,
  ) {
    return this.service.findLatestForEntity(entityType, entityId, type);
  }

  @Get(':id')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Détail d\'un document (avec historique de versions)' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_DOCUMENTS)
  @ApiOperation({ summary: 'Créer / uploader un document (gestion versioning automatique)' })
  create(@Body() dto: CreateDocumentDto, @CurrentUser() actor: User) {
    return this.service.create(dto, actor);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.MANAGE_DOCUMENTS)
  @ApiOperation({ summary: 'Mettre à jour les métadonnées d\'un document' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.update(id, dto, actor);
  }

  @Post(':id/archive')
  @Roles(UserRole.SUPER_MANAGER)
  @RequirePermission(Perm.MANAGE_DOCUMENTS)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archiver un document (ARCHIVED — non supprimé)' })
  archive(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.service.archive(id, actor);
  }
}
