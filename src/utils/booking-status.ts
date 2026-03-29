export type BookingStatusMeta = {
  normalized: string;
  label: string;
  textColorClass: string;
  badgeClass: string;
};

const PAYABLE_STATUSES = new Set(["confirmed", "payment_required", "approved"]);
const PAID_STATUSES = new Set(["success", "completed"]);

export const normalizeBookingStatus = (status?: string | null): string =>
  String(status ?? "").trim().toLowerCase();

export const isBookingPayable = (status?: string | null): boolean =>
  PAYABLE_STATUSES.has(normalizeBookingStatus(status));

export const isBookingPaid = (status?: string | null): boolean =>
  PAID_STATUSES.has(normalizeBookingStatus(status));

export const getBookingStatusMeta = (status?: string | null): BookingStatusMeta => {
  const normalized = normalizeBookingStatus(status);

  switch (normalized) {
    case "pending":
      return {
        normalized,
        label: "Chờ duyệt",
        textColorClass: "text-yellow-600",
        badgeClass: "bg-yellow-100 text-yellow-700",
      };
    case "payment_required":
    case "confirmed":
    case "approved":
      return {
        normalized,
        label: "Cần thanh toán",
        textColorClass: "text-orange-600",
        badgeClass: "bg-orange-100 text-orange-700",
      };
    case "success":
    case "completed":
      return {
        normalized,
        label: "Đã thanh toán",
        textColorClass: "text-green-600",
        badgeClass: "bg-green-100 text-green-700",
      };
    case "canceled":
    case "rejected":
      return {
        normalized,
        label: "Đã hủy",
        textColorClass: "text-red-600",
        badgeClass: "bg-red-100 text-red-700",
      };
    default:
      return {
        normalized,
        label: status?.toString() || "Không xác định",
        textColorClass: "text-gray-600",
        badgeClass: "bg-gray-100 text-gray-700",
      };
  }
};
