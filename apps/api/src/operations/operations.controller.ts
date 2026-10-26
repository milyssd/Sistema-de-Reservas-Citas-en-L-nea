import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBody,
  ApiHeader,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthGuard, CurrentUser, OptionalAuthGuard, Roles, RolesGuard } from '../common/auth.guard';
import { Actor, AuditContext, OperationsService } from './operations.service';
import { PaymentsService } from './payments.service';
import { CommunityService } from './community.service';
import {
  expectedVersion,
  resourceSchemas,
  businessSchema,
  paymentSchema,
  refundSchema,
  reviewSchema,
  waitlistSchema,
  deviceSchema,
} from './validation';
import {
  apiBusiness,
  apiCatalog,
  apiConfig,
  apiPayment,
  apiRefundLedger,
  apiPage,
  apiReport,
  apiAdminEntity,
  apiNotification,
  apiOutbox,
  apiAudit,
  apiWaitlist,
  apiReview,
  ApiPagination,
  schemaFor,
} from './openapi';
const context = (req: Request): AuditContext => ({
  ip: req.ip,
  requestId: String((req as Request & { id?: string }).id ?? ''),
});
const csvCell = (v: unknown) =>
  `"${String(v ?? '')
    .replace(/^[=+@-]/, "'$&")
    .replaceAll('"', '""')}"`;

@ApiTags('Catálogo')
@Controller()
export class CatalogController {
  constructor(
    @Inject(OperationsService) private readonly service: OperationsService,
    @Inject(CommunityService) private readonly community: CommunityService,
  ) {}
  @Get('config') @ApiOkResponse({ schema: apiConfig }) configuration() {
    return {
      vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? null,
      pushEnabled: Boolean(
        process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT,
      ),
    };
  }
  @Get('catalog') @ApiOkResponse({ schema: apiCatalog }) catalog() {
    return this.service.catalog();
  }
  @Get('calendar/:staffId') async calendar(
    @Param('staffId') id: string,
    @Query() query: unknown,
    @Res() res: Response,
  ) {
    const body = await this.community.calendar(id, query);
    res.setHeader('Cache-Control', 'private, no-store');
    res.type('text/calendar').send(body);
  }
}

@ApiTags('Administración')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'OWNER', 'SUPERADMIN')
export class AdminController {
  constructor(
    @Inject(OperationsService) private readonly service: OperationsService,
    @Inject(CommunityService) private readonly community: CommunityService,
  ) {}
  @Get('business') @ApiOkResponse({ schema: apiBusiness }) business(@CurrentUser() user: Actor) {
    return this.service.business(user);
  }
  @Patch('business')
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiBody({ schema: schemaFor(businessSchema) })
  @ApiOkResponse({ schema: apiBusiness })
  updateBusiness(
    @Body() body: unknown,
    @Headers('if-match') version: string,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.updateBusiness(body, expectedVersion(version), user, context(req));
  }
  @Get('outbox') @ApiPagination() @ApiOkResponse({ schema: apiPage(apiOutbox) }) outbox(
    @Query() query: unknown,
    @CurrentUser() user: Actor,
  ) {
    return this.community.notifications(query, user, true);
  }
  @Post('outbox/:id/retry') retry(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.community.retryNotification(id, user);
  }
  @Get('customers/:id/history') customer(
    @Param('id') id: string,
    @Query() query: unknown,
    @CurrentUser() user: Actor,
  ) {
    return this.service.customerHistory(id, query, user);
  }
  @Get(':resource')
  @ApiPagination()
  @ApiParam({ name: 'resource', enum: Object.keys(resourceSchemas) })
  @ApiOkResponse({ schema: apiPage(apiAdminEntity) })
  list(@Param('resource') resource: string, @Query() query: unknown, @CurrentUser() user: Actor) {
    return this.service.list(resource, query, user);
  }
  @Get(':resource/:id')
  @ApiParam({ name: 'resource', enum: Object.keys(resourceSchemas) })
  @ApiOkResponse({ schema: apiAdminEntity })
  get(@Param('resource') resource: string, @Param('id') id: string, @CurrentUser() user: Actor) {
    return this.service.get(resource, id, user);
  }
  @Post(':resource')
  @ApiParam({ name: 'resource', enum: Object.keys(resourceSchemas) })
  @ApiBody({ schema: { oneOf: Object.values(resourceSchemas).map(schemaFor) } })
  @ApiCreatedResponse({ schema: apiAdminEntity })
  create(
    @Param('resource') resource: string,
    @Body() body: unknown,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.create(resource, body, user, context(req));
  }
  @Patch(':resource/:id')
  @ApiParam({ name: 'resource', enum: Object.keys(resourceSchemas) })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiBody({ schema: { oneOf: Object.values(resourceSchemas).map((s) => schemaFor(s.partial())) } })
  @ApiOkResponse({ schema: apiAdminEntity })
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Body() body: unknown,
    @Headers('if-match') version: string,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.update(resource, id, expectedVersion(version), body, user, context(req));
  }
  @Delete(':resource/:id') @ApiHeader({ name: 'If-Match', required: true }) remove(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.remove(resource, id, expectedVersion(version), user, context(req));
  }
}

@ApiTags('Reportes y auditoría')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'OWNER', 'SUPERADMIN')
export class ReportsController {
  constructor(@Inject(OperationsService) private readonly service: OperationsService) {}
  @Get('reports')
  @ApiQuery({ name: 'from', required: true, schema: { type: 'string', format: 'date-time' } })
  @ApiQuery({ name: 'to', required: true, schema: { type: 'string', format: 'date-time' } })
  @ApiOkResponse({ schema: apiReport })
  reports(@Query() query: unknown, @CurrentUser() user: Actor) {
    return this.service.reports(query, user);
  }
  @Get('reports.csv') async csv(
    @Query() query: unknown,
    @CurrentUser() user: Actor,
    @Res() res: Response,
  ) {
    const report = await this.service.reports(query, user);
    const rows = [
      ['Servicio', 'Reservas', 'Valor de servicios Bs', 'Minutos'],
      ...report.byService.map((s) => [
        s.serviceName,
        s._count._all,
        s._sum.price,
        s._sum.durationMinutes,
      ]),
    ];
    res.setHeader('Content-Disposition', 'attachment; filename="reporte.csv"');
    res.setHeader('Cache-Control', 'no-store');
    res
      .type('text/csv')
      .send('\uFEFF' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n'));
  }
  @Get('audit') @ApiPagination() @ApiOkResponse({ schema: apiPage(apiAudit) }) audit(
    @Query() query: unknown,
    @CurrentUser() user: Actor,
  ) {
    return this.service.audits(query, user);
  }
}

@ApiTags('Pagos')
@Controller('payments')
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly service: PaymentsService) {}
  @Get('instructions') instructions() {
    return this.service.instructions();
  }
  @Get()
  @UseGuards(AuthGuard)
  @ApiPagination()
  @ApiOkResponse({ schema: apiPage(apiPayment) })
  list(@Query() query: unknown, @CurrentUser() user: Actor) {
    return this.service.list(query, user);
  }
  @Post()
  @UseGuards(OptionalAuthGuard)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'X-Booking-Token', required: false })
  @ApiBody({ schema: schemaFor(paymentSchema) })
  @ApiCreatedResponse({ schema: apiPayment })
  create(
    @Body() body: unknown,
    @Headers('idempotency-key') key: string,
    @Headers('x-booking-token') token: string,
    @CurrentUser() user?: Actor,
  ) {
    return this.service.create(body, key, user, token);
  }
  @Post(':id/receipt')
  @UseGuards(OptionalAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ schema: apiPayment })
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } }),
  )
  upload(
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @Headers('x-booking-token') token: string,
    @UploadedFile() file: { buffer: Buffer; size: number },
    @CurrentUser() user?: Actor,
  ) {
    return this.service.upload(id, expectedVersion(version), file, user, token);
  }
  @Get(':id/receipt')
  @UseGuards(OptionalAuthGuard)
  @ApiProduces('image/webp')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  async receipt(
    @Param('id') id: string,
    @Headers('x-booking-token') token: string,
    @CurrentUser() user: Actor | undefined,
    @Res() res: Response,
  ) {
    const buffer = await this.service.receipt(id, user, token);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', 'inline; filename="comprobante.webp"');
    res.type('image/webp').send(buffer);
  }
  @Patch(':id/confirm')
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiOkResponse({ schema: apiPayment })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string', maxLength: 500 } } },
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'SUPERADMIN')
  confirm(
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @Body() body: unknown,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.review(id, expectedVersion(version), 'confirm', body, user, context(req));
  }
  @Patch(':id/reject')
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiOkResponse({ schema: apiPayment })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string', maxLength: 500 } } },
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'SUPERADMIN')
  reject(
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @Body() body: unknown,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.review(id, expectedVersion(version), 'reject', body, user, context(req));
  }
  @Get(':id/refunds')
  @ApiOkResponse({ schema: apiRefundLedger })
  @UseGuards(OptionalAuthGuard)
  @ApiPagination()
  refunds(
    @Param('id') id: string,
    @Query() query: unknown,
    @Headers('x-booking-token') token: string,
    @CurrentUser() user?: Actor,
  ) {
    return this.service.refunds(id, query, user, token);
  }
  @Patch(':id/refund')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiOkResponse({ schema: apiPayment })
  @ApiBody({ schema: schemaFor(refundSchema) })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'SUPERADMIN')
  refund(
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.refund(id, expectedVersion(version), body, key, user, context(req));
  }
  @Patch(':id/retain')
  @ApiHeader({ name: 'If-Match', required: true })
  @ApiOkResponse({ schema: apiPayment })
  @ApiBody({
    schema: { type: 'object', properties: { reason: { type: 'string', maxLength: 500 } } },
  })
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'OWNER', 'SUPERADMIN')
  retain(
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @Body() body: unknown,
    @CurrentUser() user: Actor,
    @Req() req: Request,
  ) {
    return this.service.review(id, expectedVersion(version), 'retain', body, user, context(req));
  }
}

@ApiTags('Comunidad')
@ApiBearerAuth()
@Controller()
@UseGuards(AuthGuard)
export class CommunityController {
  constructor(@Inject(CommunityService) private readonly service: CommunityService) {}
  @Get('notifications')
  @ApiPagination()
  @ApiOkResponse({ schema: apiPage(apiNotification) })
  notifications(@Query() query: unknown, @CurrentUser() user: Actor) {
    return this.service.notifications(query, user);
  }
  @Patch('notifications/:id/read') read(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.service.readNotification(id, user);
  }
  @Post('devices') @ApiBody({ schema: schemaFor(deviceSchema) }) device(
    @Body() body: unknown,
    @CurrentUser() user: Actor,
  ) {
    return this.service.device(body, user);
  }
  @Delete('devices/:id') removeDevice(@Param('id') id: string, @CurrentUser() user: Actor) {
    return this.service.removeDevice(id, user);
  }
  @Post('waitlist')
  @ApiBody({ schema: schemaFor(waitlistSchema) })
  @ApiCreatedResponse({ schema: apiWaitlist })
  join(@Body() body: unknown, @CurrentUser() user: Actor) {
    return this.service.joinWaitlist(body, user);
  }
  @Get('waitlist') @ApiPagination() @ApiOkResponse({ schema: apiPage(apiWaitlist) }) waitlist(
    @Query() query: unknown,
    @CurrentUser() user: Actor,
  ) {
    return this.service.waitlist(query, user);
  }
  @Delete('waitlist/:id') leave(
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @CurrentUser() user: Actor,
  ) {
    return this.service.leaveWaitlist(id, expectedVersion(version), user);
  }
  @Post('reviews')
  @ApiBody({ schema: schemaFor(reviewSchema) })
  @ApiCreatedResponse({ schema: apiReview })
  review(@Body() body: unknown, @CurrentUser() user: Actor) {
    return this.service.review(body, user);
  }
  @Get('staff/me') profile(@CurrentUser() user: Actor) {
    return this.service.staffProfile(user);
  }
  @Post('staff/:id/calendar-token') calendar(
    @Param('id') id: string,
    @Headers('if-match') version: string,
    @CurrentUser() user: Actor,
  ) {
    return this.service.calendarToken(id, expectedVersion(version), user);
  }
}
