/**
 * Booking Types
 */

export type BookingType = "half" | "full";
export type BookingStatus =
  | "pending"
  | "payment_required"
  | "confirmed"
  | "approved"
  | "success"
  | "completed"
  | "canceled"
  | "rejected";

export interface Club {
  id: number;
  name: string;
  address: string;
  score: number;
  status: "active" | "inactive";
  player_id: number;
}

export interface Cluster {
  id: number;
  name: string;
  street: string;
  district: string;
  city: string;
  status: "active" | "inactive";
  open_time: string;
  close_time: string;
}

// Field from API (without nested cluster)
export interface FieldBasic {
  id: number;
  sport_type_id?: number;
  sport_type?: {
    id: number;
    name: string;
    created_at?: string;
  };
  size: string;
  description: string;
  status: "active" | "inactive";
  price_per_hour: number;
  cluster_id: number;
  created_at: string;
  updated_at: string;
}

// Field with nested cluster (from booking details)
export interface Field {
  id: number;
  size: string;
  description: string;
  status: "active" | "inactive";
  price_per_hour: number;
  cluster_id: number;
  cluster: Cluster;
}

export interface Booking {
  id: number;
  type: BookingType;
  booking_date: string;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  total_price: number;
  club_id: number;
  player_id: number;
  field_id: number;
  zalopay_order_url?: string | null;
  club: Club;
  field: Field;
  created_at: string;
  updated_at: string;
}

export interface GetPlayerBookingsResponse {
  data: {
    bookings: Booking[];
    total: number;
    offset: number;
    limit: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface GetPlayerBookingsParams {
  playerId: number;
  offset?: number;
  limit?: number;
}

/**
 * Field Availability Types
 */

export interface TimeSlot {
  start_time: string; // Format: "HH:MM:SS"
  end_time: string;   // Format: "HH:MM:SS"
}

export interface BookedTimeSlot extends TimeSlot {
  booking_type?: string;
}

export interface FieldWithAvailability {
  field: FieldBasic;
  available_slots: TimeSlot[];
  booked_slots: BookedTimeSlot[];
}

export interface GetFieldAvailabilityResponse {
  data: {
    fields: FieldWithAvailability[];
    total: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

export interface GetFieldAvailabilityParams {
  clusterId: number;
  bookingDate: string; // Format: "YYYY-MM-DD"
}

export interface GetFieldAvailabilityByFieldParams {
  fieldId: number;
  bookingDate: string; // Format: "YYYY-MM-DD"
}

export interface GetFieldAvailabilityByFieldResponse {
  data: FieldWithAvailability;
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

/**
 * Owner Booking Types
 */
export interface GetOwnerBookingsParams {
  clusterId: number;
  offset?: number;
  limit?: number;
}

export interface GetOwnerBookingsResponse {
  data: {
    bookings: Booking[];
    total: number;
    offset: number;
    limit: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}

/**
 * Owner Fields Types
 */
export interface GetOwnerFieldsResponse {
  data: {
    fields: FieldBasic[];
    total: number;
  };
  api_version: string;
  errors: {
    msg: string[];
    code: null | string;
  };
}
