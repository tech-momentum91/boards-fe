import { z } from 'zod';

export const SPACE_TYPE = {
  MANAGED_OFFICE: 'Managed Office',
  CO_WORKING: 'Co-working Space',
  RESOURCE: 'Resource',
  PARKING: 'Parking',
  PURE_RENTAL: 'Pure Rental',
};

export const spaceCreateSchema = z
  .object({
    center: z.string().optional(),
    floor: z.string().optional(),
    space_type: z.string().min(1, 'Space Type is required'),
    space_name: z.string().min(1, 'Space Name is required'),
    status: z.string().optional(),
    photos: z.array(z.any()).optional(),
    plan_file: z.any().optional(),
    co_working: z
      .object({
        co_working_space_type: z.string().optional(), // Select
        total_carpet_area: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Float (mapped to total_carpet_sft in backend)
        actual_carpet_area: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Float
        expected_carpet_rate: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Currency
        total_seats: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        expected_per_seat_rate: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Currency (mapped to expected_per_seat_cost in backend)
        credit_per_seat: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int, default: 2
        total_rate_of_space: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Calculated field
        total_credits: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Calculated field
      })
      .optional(),
    resource: z
      .object({
        resource_type: z.string().optional(), // Select
        pax: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        credit_per_hour: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int, default: 2
        bookable: z.union([z.boolean(), z.string()]).optional(), // Switch returns boolean, backend expects string
        agreement_carpet_area: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()),
        actual_carpet_area: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()),
        expected_carpet_rate: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()),
        expected_per_seat_rate: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()),
        credit_per_seat: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()),
        total_rate_of_space: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()),
      })
      .optional(),
    managed_office: z
      .object({
        managed_office_type: z.string().optional(), // Select
        total_carpet_area: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Float (mapped to total_carpet_sft in backend)
        actual_carpet_area: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Float
        expected_carpet_rate: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Currency
        total_seats: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        total_sellable_seats: z.string().optional(), // Keep for backward compatibility
        expected_per_seat_rate: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Currency
        no_of_workstations: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        director_cabins: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int (mapped to director_cabin in backend)
        manager_cabins: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        meeting_rooms: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        conference_rooms: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        phonebooths: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        breakout_zones: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int
        credit_per_seat: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Int, default: 2
        total_rate_of_space: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Calculated field
      })
      .optional(),
    pure_rental: z
      .object({
        pure_rental_type: z.string().optional(), // Select: Furnished | Unfurnished
        total_carpet_sft: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Float
        actual_carpet_area: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Float
        expected_carpet_rate: z.preprocess((value) => {
          if (value === '' || value === null || value === undefined) return undefined;
          const number_ = Number(value);
          return Number.isNaN(number_) ? undefined : number_;
        }, z.number().optional()), // Currency
      })
      .optional(),
  })
  .superRefine((data, context) => {
    if (
      data.space_type === SPACE_TYPE.MANAGED_OFFICE &&
      !data.managed_office?.managed_office_type
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Manage Office Type is required',
        path: ['managed_office', 'managed_office_type'],
      });
    }

    if (data.space_type === SPACE_TYPE.CO_WORKING) {
      if (!data.co_working?.co_working_space_type) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Co-Working Space Type is required',
          path: ['co_working', 'co_working_space_type'],
        });
      }
      // Backend now uses total_seats (replaced no_of_seats)
      if (!data.co_working?.total_seats && !data.co_working?.no_of_seats) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Total Sellable Seats is required',
          path: ['co_working', 'total_seats'],
        });
      }
    }

    if (data.space_type === SPACE_TYPE.RESOURCE) {
      if (!data.resource?.resource_type) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Resource Type is required',
          path: ['resource', 'resource_type'],
        });
      }
      if (!data.resource?.pax) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'PAX (Max Capacity) is required',
          path: ['resource', 'pax'],
        });
      }
      const isBookable = data.resource?.bookable !== false && data.resource?.bookable !== 'No';
      if (!isBookable) {
        if (!data.resource?.expected_per_seat_rate) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Expected Per Seat Rate is required',
            path: ['resource', 'expected_per_seat_rate'],
          });
        }
        if (!data.resource?.credit_per_seat) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Credit Per Seat is required',
            path: ['resource', 'credit_per_seat'],
          });
        }
      }
    }

    if (data.space_type === SPACE_TYPE.PURE_RENTAL) {
      if (!data.pure_rental?.pure_rental_type) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Pure Rental Type is required',
          path: ['pure_rental', 'pure_rental_type'],
        });
      }
      if (!data.pure_rental?.total_carpet_sft) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Agreement Carpet Area is required',
          path: ['pure_rental', 'total_carpet_sft'],
        });
      }
      if (!data.pure_rental?.expected_carpet_rate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Expected Carpet Rate is required',
          path: ['pure_rental', 'expected_carpet_rate'],
        });
      }
    }
  });

export const defaultSpaceCreateValues = {
  center: '',
  floor: '',
  space_type: SPACE_TYPE.MANAGED_OFFICE,
  space_name: '',
  status: 'Available',
  photos: [],
  plan_file: null,
  co_working: {
    co_working_space_type: '',
    total_carpet_area: '', // Float (mapped to total_carpet_sft in backend)
    actual_carpet_area: '', // Float
    expected_carpet_rate: '', // Currency
    total_seats: '', // Int
    expected_per_seat_rate: '', // Currency (mapped to expected_per_seat_cost in backend)
    credit_per_seat: 2, // Int, default: 2
    total_rate_of_space: '', // Calculated
    total_credits: '', // Calculated
  },
  resource: {
    resource_type: '',
    pax: '', // Int
    credit_per_hour: 2, // Int, default: 2
    bookable: true, // default on; backend expects "Yes" | "No"
    agreement_carpet_area: '',
    actual_carpet_area: '',
    expected_carpet_rate: '',
    expected_per_seat_rate: '',
    credit_per_seat: 2,
    total_rate_of_space: '',
  },
  managed_office: {
    managed_office_type: '',
    total_carpet_area: '', // Float (mapped to total_carpet_sft in backend)
    actual_carpet_area: '', // Float
    expected_carpet_rate: '', // Currency
    total_seats: '', // Int
    total_sellable_seats: '', // Keep for backward compatibility
    expected_per_seat_rate: '', // Currency
    no_of_workstations: '', // Int
    director_cabins: '', // Int (mapped to director_cabin in backend)
    manager_cabins: '', // Int
    meeting_rooms: '', // Int
    conference_rooms: '', // Int
    phonebooths: '', // Int
    breakout_zones: '', // Int
    credit_per_seat: 2, // Int, default: 2
    total_rate_of_space: '', // Calculated
  },
  pure_rental: {
    pure_rental_type: '', // Select: Furnished | Unfurnished
    total_carpet_sft: '', // Float
    actual_carpet_area: '', // Float
    expected_carpet_rate: '', // Currency
  },
};
