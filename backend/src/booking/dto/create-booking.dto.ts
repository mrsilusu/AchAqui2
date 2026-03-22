import { HtBookingStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  Max,
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

// Custom validator: endDate deve ser posterior a startDate
function IsAfterDate(property: string, options?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name:       'isAfterDate',
      target:     object.constructor,
      propertyName,
      constraints: [property],
      options,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedProp] = args.constraints;
          const related = (args.object as any)[relatedProp];
          if (!value || !related) return true; // deixar o @IsDateString tratar
          return new Date(value) > new Date(related);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} deve ser posterior a ${args.constraints[0]}.`;
        },
      },
    });
  };
}

export enum BookingTypeDto {
  TABLE = 'TABLE',
  ROOM  = 'ROOM',
}

export class CreateBookingDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  @IsAfterDate('startDate', { message: 'endDate deve ser posterior a startDate.' })
  endDate: string;

  @IsUUID()
  businessId: string;

  @IsOptional()
  @IsEnum(HtBookingStatus)
  status?: HtBookingStatus;

  @IsOptional()
  @IsEnum(BookingTypeDto)
  bookingType?: BookingTypeDto;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  adults?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  children?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  rooms?: number;

  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  specialRequest?: string;
}
