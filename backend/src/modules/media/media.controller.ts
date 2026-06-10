import {
  Controller, Get, Post, Param, Query, Body,
  UseInterceptors, UploadedFile,
  ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes,
  ApiBody, ApiQuery,
} from '@nestjs/swagger';
import { UserRole, User } from '@prisma/client';
import { MediaService } from './media.service';
import {
  UploadMediaDto, CreatePhotoDto, CreatePhotoMissionDto,
  SubmitPhotoMissionDto, MediaFiltersDto, PhotoMissionFiltersDto,
} from './dto/media.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Perm } from '../../common/constants/permissions';

@ApiTags('media')
@ApiBearerAuth('JWT')
@Controller('media')
export class MediaController {
  constructor(private readonly service: MediaService) {}

  // ─── MediaAsset upload ────────────────────────────────────────────────────

  @Post('upload')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Upload un fichier — crée un MediaAsset' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ description: 'Fichier multipart + métadonnées JSON' })
  @UseInterceptors(FileInterceptor('file', { storage: undefined })) // buffer mode
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadMediaDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.upload(file, dto, actor);
  }

  // ─── Photo wrapper ────────────────────────────────────────────────────────

  @Post('photos')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Créer un wrapper Photo depuis un MediaAsset' })
  createPhoto(@Body() dto: CreatePhotoDto, @CurrentUser() actor: User) {
    return this.service.createPhoto(dto, actor);
  }

  // ─── Photo Mission (POST) ────────────────────────────────────────────────

  @Post('photo-missions')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.CREATE_PHOTO_MISSION)
  @ApiOperation({ summary: 'Créer une mission photo pour un chauffeur' })
  createPhotoMission(@Body() dto: CreatePhotoMissionDto, @CurrentUser() actor: User) {
    return this.service.createPhotoMission(dto, actor);
  }

  @Post('photo-missions/:id/submit')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Soumettre une mission photo (chauffeur)' })
  submitPhotoMission(
    @Param('id') id: string,
    @Body() dto: SubmitPhotoMissionDto,
    @CurrentUser() actor: User,
  ) {
    return this.service.submitPhotoMission(id, dto, actor);
  }

  @Post('photo-missions/:id/validate')
  @Roles(UserRole.MANAGER)
  @RequirePermission(Perm.VALIDATE_PHOTO_MISSION)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Valider une mission photo soumise' })
  validatePhotoMission(@Param('id') id: string, @CurrentUser() actor: User) {
    return this.service.validatePhotoMission(id, actor);
  }

  // ─── GET routes — ordre critique (G-03) ───────────────────────────────────
  // Règle : routes statiques ET préfixes fixes AVANT /:id
  // Sinon Express match "photo-missions" comme `:id` sur GET /:id.

  /** GET /media/photo-missions — doit être avant GET /:id */
  @Get('photo-missions')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les missions photo' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findPhotoMissions(
    @Query() filters: PhotoMissionFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findPhotoMissions(filters, page, limit);
  }

  /** GET /media/photo-missions/:id — doit être avant GET /:id */
  @Get('photo-missions/:id')
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Détail d\'une mission photo' })
  findPhotoMissionById(@Param('id') id: string) {
    return this.service.findPhotoMissionById(id);
  }

  /** GET /media/:id/url — doit être avant GET /:id pour éviter collision */
  @Get(':id/url')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Obtenir l\'URL (signée) d\'un MediaAsset' })
  getSignedUrl(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.getSignedUrl(id, user);
  }

  /** GET /media/:id — route paramétrique générique (toujours après les routes statiques) */
  @Get(':id')
  @Roles(UserRole.DRIVER)
  @ApiOperation({ summary: 'Détail d\'un MediaAsset' })
  findById(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.findById(id, user);
  }

  /** GET /media — liste (après les routes paramétriques pour cohérence) */
  @Get()
  @Roles(UserRole.MANAGER)
  @ApiOperation({ summary: 'Lister les MediaAssets (filtrés par entité)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query() filters: MediaFiltersDto,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.service.findAll(filters, page, limit);
  }
}
