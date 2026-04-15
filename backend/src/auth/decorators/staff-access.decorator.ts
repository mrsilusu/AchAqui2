import { SetMetadata } from '@nestjs/common';
import { AppModule, StaffRole } from '@prisma/client';

export type StaffAccessOptions = {
  module: AppModule;
  roles?: StaffRole[];
  sections?: string[];
};

export const STAFF_ACCESS_KEY = 'staffAccess';
export const StaffAccess = (options: StaffAccessOptions) => SetMetadata(STAFF_ACCESS_KEY, options);
