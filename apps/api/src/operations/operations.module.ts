import { Module } from '@nestjs/common';
import { OperationsService } from './operations.service';
import { PaymentsService } from './payments.service';
import { CommunityService } from './community.service';
import {
  AdminController,
  CatalogController,
  CommunityController,
  PaymentsController,
  ReportsController,
} from './operations.controller';
@Module({
  providers: [OperationsService, PaymentsService, CommunityService],
  controllers: [
    CatalogController,
    AdminController,
    ReportsController,
    PaymentsController,
    CommunityController,
  ],
  exports: [OperationsService, PaymentsService],
})
export class OperationsModule {}
