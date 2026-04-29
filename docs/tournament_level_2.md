# Tournament Level 2 — API & UI Flow Guide

Tài liệu này mô tả tính năng **đặt sân giải đấu tự động (Level 2)** dành cho Frontend Developer.

---

## Tổng quan

| | Level 1 | Level 2 |
|-|---------|---------|
| Organizer chọn sân | Thủ công (tự chọn field + time slot) | Hệ thống gợi ý slot trống |
| Hình thức | Bulk booking tự do | Single elimination (đá loại trực tiếp) |
| Số vòng | Không có khái niệm vòng | Tự động tính từ số đội |
| Booking tạo khi nào | Ngay khi tạo tournament | Từng vòng, sau khi organizer confirm slot |

---

## Luồng tổng thể

```
[Organizer]
    │
    ├─ 1. Tạo giải đấu + cấu hình tất cả vòng
    │      POST /api/v1/tournaments/v2
    │      → Nhận về tournament_id + round_id của từng vòng
    │
    ├─ 2. Xem slot trống của vòng 1
    │      GET /api/v1/tournaments/{id}/rounds/{round_id}/available-slots
    │      → Nhận danh sách (field, date, start_time, end_time, price)
    │
    ├─ 3. Chọn đủ slot → xác nhận vòng 1
    │      POST /api/v1/tournaments/{id}/rounds/{round_id}/schedule
    │      → Bookings được tạo, round.status = "scheduled"
    │
    ├─ 4. Lặp bước 2–3 cho vòng 2, vòng 3, ...
    │      (Chỉ unlock được vòng sau khi vòng trước đã scheduled)
    │
    │  [Sau khi tất cả vòng scheduled → backend tự gửi notification cho Owner]
    │
[Owner]
    ├─ 5. Xác nhận toàn bộ bookings
    │      PATCH /api/v1/tournaments/{id}?action=owner-confirm   ← API cũ (Level 1)
    │
[Organizer]
    └─ 6. Thanh toán 1 lần (tổng tiền tất cả vòng)
           GET /api/v1/payments/zalopay/tournament/{id}          ← API cũ (Level 1)
```

---

## Số trận mỗi vòng (Single Elimination)

`match_count` được tính tự động — FE **không cần tính**, backend trả về trong response.

| size | Vòng 1 | Vòng 2 | Vòng 3 | Vòng 4 |
|------|--------|--------|--------|--------|
| 8    | 4      | 2      | 1      | —      |
| 16   | 8      | 4      | 2      | 1      |
| 32   | 16     | 8      | 4      | 2      | 1 |

---

## Chi tiết từng API

### API 1 — Tạo giải đấu Level 2

```
POST /api/v1/tournaments/v2
Authorization: Bearer <organizer_token>
Content-Type: application/json
```

**Request body:**
```json
{
  "name": "Giải bóng đá mùa hè 2026",
  "sport_type": "football",
  "size": 8,
  "entry_fee": 100000,
  "rounds": [
    {
      "round_number": 1,
      "cluster_id": 1,
      "start_date": "2026-05-22",
      "end_date": "2026-05-25",
      "daily_start_time": "06:00:00",
      "daily_end_time": "10:00:00",
      "match_duration_mins": 90
    },
    {
      "round_number": 2,
      "cluster_id": 1,
      "start_date": "2026-05-29",
      "end_date": "2026-05-31",
      "daily_start_time": "07:00:00",
      "daily_end_time": "10:00:00",
      "match_duration_mins": 90
    },
    {
      "round_number": 3,
      "cluster_id": 1,
      "start_date": "2026-06-05",
      "end_date": "2026-06-05",
      "daily_start_time": "15:00:00",
      "daily_end_time": "17:00:00",
      "match_duration_mins": 90
    }
  ]
}
```

**Curl:**
```bash
curl -X POST https://BASE_URL/api/v1/tournaments/v2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Giải bóng đá mùa hè 2026",
    "sport_type": "football",
    "size": 8,
    "entry_fee": 100000,
    "rounds": [
      {"round_number":1,"cluster_id":1,"start_date":"2026-05-22","end_date":"2026-05-25","daily_start_time":"06:00:00","daily_end_time":"10:00:00","match_duration_mins":90},
      {"round_number":2,"cluster_id":1,"start_date":"2026-05-29","end_date":"2026-05-31","daily_start_time":"07:00:00","daily_end_time":"10:00:00","match_duration_mins":90},
      {"round_number":3,"cluster_id":1,"start_date":"2026-06-05","end_date":"2026-06-05","daily_start_time":"15:00:00","daily_end_time":"17:00:00","match_duration_mins":90}
    ]
  }'
```

**Response (200):**
```json
{
  "data": {
    "id": 42,
    "name": "Giải bóng đá mùa hè 2026",
    "sport_type": "football",
    "size": 8,
    "entry_fee": 100000,
    "level": 2,
    "organizer_id": 7,
    "total_rounds": 3,
    "rounds": [
      {
        "id": 10,
        "tournament_id": 42,
        "round_number": 1,
        "match_count": 4,
        "cluster_id": 1,
        "start_date": "2026-05-22",
        "end_date": "2026-05-25",
        "daily_start_time": "06:00:00",
        "daily_end_time": "10:00:00",
        "match_duration_mins": 90,
        "status": "pending"
      },
      {
        "id": 11,
        "round_number": 2,
        "match_count": 2,
        "status": "pending",
        "..."
      },
      {
        "id": 12,
        "round_number": 3,
        "match_count": 1,
        "status": "pending",
        "..."
      }
    ],
    "created_at": "2026-04-23T10:00:00"
  }
}
```

> **FE lưu lại:** `data.id` (tournament_id) và `data.rounds[i].id` (round_id của từng vòng).

**Validation errors (400):**
- `size` không phải 2^n → `INVALID_REQUEST`
- Số vòng trong `rounds` không khớp `log2(size)` → `INVALID_ROUND_NUMBERS`
- `round_number` trùng hoặc thiếu → `INVALID_ROUND_NUMBERS`
- Date range các vòng overlap → `ROUND_DATE_OVERLAP`
- Daily time window ngắn hơn `match_duration_mins` → `TIME_WINDOW_TOO_SHORT`

---

### API 2 — Xem slot trống cho một vòng

```
GET /api/v1/tournaments/{tournament_id}/rounds/{round_id}/available-slots
Authorization: Bearer <organizer_token>
```

**Curl:**
```bash
curl -X GET https://BASE_URL/api/v1/tournaments/42/rounds/10/available-slots \
  -H "Authorization: Bearer <token>"
```

**Response (200):**
```json
{
  "data": {
    "round_id": 10,
    "round_number": 1,
    "match_count": 4,
    "already_scheduled": 0,
    "slots_needed": 4,
    "available_slots": [
      {
        "field_id": 101,
        "field_name": "Sân A",
        "date": "2026-05-22",
        "start_time": "06:00:00",
        "end_time": "07:30:00",
        "estimated_price": 150000.0
      },
      {
        "field_id": 101,
        "field_name": "Sân A",
        "date": "2026-05-22",
        "start_time": "07:30:00",
        "end_time": "09:00:00",
        "estimated_price": 150000.0
      },
      {
        "field_id": 102,
        "field_name": "Sân B",
        "date": "2026-05-22",
        "start_time": "06:00:00",
        "end_time": "07:30:00",
        "estimated_price": 120000.0
      }
    ]
  }
}
```

> **FE cần hiển thị** toàn bộ `available_slots` và cho phép organizer chọn đúng `slots_needed` slot.
> Slots đã được sắp xếp theo `date ASC, start_time ASC`.

**Errors:**
- Vòng trước chưa scheduled → `PREVIOUS_ROUND_NOT_SCHEDULED` (400)
- Vòng đã scheduled rồi → `ROUND_ALREADY_SCHEDULED` (400)
- Không có field active trong cluster → `NO_FIELDS_IN_CLUSTER` (400)

---

### API 3 — Xác nhận slot → tạo bookings cho vòng

```
POST /api/v1/tournaments/{tournament_id}/rounds/{round_id}/schedule
Authorization: Bearer <organizer_token>
Content-Type: application/json
```

**Request body:**
```json
{
  "selected_slots": [
    {
      "field_id": 101,
      "date": "2026-05-22",
      "start_time": "06:00:00",
      "end_time": "07:30:00"
    },
    {
      "field_id": 101,
      "date": "2026-05-22",
      "start_time": "07:30:00",
      "end_time": "09:00:00"
    },
    {
      "field_id": 102,
      "date": "2026-05-23",
      "start_time": "06:00:00",
      "end_time": "07:30:00"
    },
    {
      "field_id": 102,
      "date": "2026-05-24",
      "start_time": "06:00:00",
      "end_time": "07:30:00"
    }
  ]
}
```

> **Quan trọng:** `field_id`, `date`, `start_time`, `end_time` phải copy **y chang** từ `available_slots` — không tự bịa.

**Curl:**
```bash
curl -X POST https://BASE_URL/api/v1/tournaments/42/rounds/10/schedule \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "selected_slots": [
      {"field_id":101,"date":"2026-05-22","start_time":"06:00:00","end_time":"07:30:00"},
      {"field_id":101,"date":"2026-05-22","start_time":"07:30:00","end_time":"09:00:00"},
      {"field_id":102,"date":"2026-05-23","start_time":"06:00:00","end_time":"07:30:00"},
      {"field_id":102,"date":"2026-05-24","start_time":"06:00:00","end_time":"07:30:00"}
    ]
  }'
```

**Response (200):**
```json
{
  "data": {
    "round_id": 10,
    "round_number": 1,
    "match_count": 4,
    "status": "scheduled",
    "bookings_created": 4
  }
}
```

**Error codes:**

| Code | HTTP | Nguyên nhân |
|------|------|-------------|
| `SLOT_COUNT_MISMATCH` | 400 | Số slot gửi lên ≠ `match_count` của vòng |
| `PREVIOUS_ROUND_NOT_SCHEDULED` | 400 | Vòng trước chưa được schedule |
| `ROUND_ALREADY_SCHEDULED` | 400 | Vòng đã schedule rồi, không thể submit lại |
| `INVALID_FIELD_FOR_CLUSTER` | 400 | `field_id` không thuộc cluster của vòng |
| `SLOT_DATE_OUT_OF_RANGE` | 400 | `date` nằm ngoài `start_date–end_date` của vòng |
| `SLOT_TIME_OUT_OF_WINDOW` | 400 | Giờ nằm ngoài `daily_start–daily_end` của vòng |
| `SLOT_CONFLICT` | 409 | Slot vừa bị người khác đặt → chọn slot khác |

---

### API 4 — Owner xác nhận *(API cũ Level 1)*

```
PATCH /api/v1/tournaments/{tournament_id}?action=owner-confirm
Authorization: Bearer <owner_token>
```

**Curl:**
```bash
curl -X PATCH "https://BASE_URL/api/v1/tournaments/42?action=owner-confirm" \
  -H "Authorization: Bearer <owner_token>"
```

Toàn bộ bookings của tournament chuyển từ `pending` → `confirmed`.
Payment `expires_at` được set = thời điểm trận đấu sớm nhất − 24 giờ.

---

### API 5 — Organizer lấy QR thanh toán *(API cũ Level 1)*

```
GET /api/v1/payments/zalopay/tournament/{tournament_id}
Authorization: Bearer <organizer_token>
```

**Curl:**
```bash
curl -X GET https://BASE_URL/api/v1/payments/zalopay/tournament/42 \
  -H "Authorization: Bearer <token>"
```

Trả về 1 QR ZaloPay duy nhất với tổng tiền = sum của tất cả payment thuộc tournament.

---

## UI Flow chi tiết

### Screen 1 — Form tạo giải đấu

```
┌─────────────────────────────────────────┐
│  Tạo giải đấu mới (Level 2)             │
│                                         │
│  Tên giải đấu: [________________]       │
│  Môn thể thao: [dropdown]               │
│  Số đội:       [8 ▾] (chỉ 8/16/32/64)  │
│  Phí tham gia: [________] VNĐ           │
│                                         │
│  ── Cấu hình vòng đấu ──────────────── │
│                                         │
│  Vòng 1  (4 trận*)                      │
│    Cụm sân:    [dropdown cluster]       │
│    Từ ngày:    [22/05/2026]             │
│    Đến ngày:   [25/05/2026]             │
│    Giờ bắt đầu mỗi ngày: [06:00]       │
│    Giờ kết thúc mỗi ngày: [10:00]      │
│    Thời lượng mỗi trận:  [90] phút     │
│                                         │
│  Vòng 2  (2 trận*)                      │
│    ... (tương tự)                       │
│                                         │
│  Vòng 3 — Chung kết  (1 trận*)          │
│    ... (tương tự)                       │
│                                         │
│  * Số trận tự tính, hiển thị readonly   │
│                                         │
│              [Tạo giải đấu]             │
└─────────────────────────────────────────┘
```

→ Gọi `POST /tournaments/v2`
→ Lưu `tournament_id` và mảng `rounds` (gồm `id`, `round_number`, `match_count`)

---

### Screen 2 — Màn hình xếp lịch (sau khi tạo)

```
┌─────────────────────────────────────────┐
│  Giải bóng đá mùa hè 2026              │
│  Xếp lịch thi đấu                       │
│                                         │
│  ○ Vòng 1  — Cần chọn 4/4 slot  [Chọn] │
│  🔒 Vòng 2  — Chờ vòng 1 xong          │
│  🔒 Vòng 3  — Chờ vòng 2 xong          │
│                                         │
│  ──────────────────────────────────── │
│  💡 Hoàn thành tất cả vòng để gửi      │
│     yêu cầu xác nhận tới Owner         │
└─────────────────────────────────────────┘
```

Trạng thái từng vòng:

| round.status | Hiển thị |
|--------------|----------|
| `pending` (vòng đầu hoặc vòng trước đã scheduled) | `[Chọn slot]` — clickable |
| `pending` (vòng trước chưa scheduled) | 🔒 Locked |
| `scheduled` | ✅ Đã xếp lịch |

---

### Screen 3 — Chọn slot cho một vòng

→ Gọi `GET /tournaments/{id}/rounds/{round_id}/available-slots`

```
┌─────────────────────────────────────────┐
│  Vòng 1 — Chọn 4 slot                  │
│  22/05–25/05 │ 06:00–10:00 │ 90 phút   │
│                                         │
│  Đã chọn: 2/4  ████░░░░                 │
│                                         │
│  📅 22/05/2026                          │
│  ┌──────┬──────────────┬──────────────┐ │
│  │ Sân  │ Giờ          │ Giá          │ │
│  ├──────┼──────────────┼──────────────┤ │
│  │ Sân A│ 06:00–07:30  │ 150,000đ [✓]│ │
│  │ Sân A│ 07:30–09:00  │ 150,000đ [+]│ │
│  │ Sân B│ 06:00–07:30  │ 120,000đ [✓]│ │
│  │ Sân B│ 07:30–09:00  │ 120,000đ [+]│ │
│  └──────┴──────────────┴──────────────┘ │
│                                         │
│  📅 23/05/2026                          │
│  ┌──────┬──────────────┬──────────────┐ │
│  │ Sân A│ 06:00–07:30  │ 150,000đ [+]│ │
│  │ Sân B│ 06:00–07:30  │ 120,000đ [+]│ │
│  └──────┴──────────────┴──────────────┘ │
│                                         │
│     [Xác nhận vòng 1]  ← active khi 4/4│
└─────────────────────────────────────────┘
```

Khi bấm **Xác nhận vòng 1** → gọi `POST /tournaments/{id}/rounds/{round_id}/schedule`

---

### Screen 4 — Tất cả vòng scheduled

```
┌─────────────────────────────────────────┐
│  Giải bóng đá mùa hè 2026              │
│                                         │
│  ✅ Vòng 1  — 4 trận đã xếp lịch       │
│  ✅ Vòng 2  — 2 trận đã xếp lịch       │
│  ✅ Vòng 3  — 1 trận đã xếp lịch       │
│                                         │
│  ⏳ Đang chờ Owner xác nhận...          │
│  (Owner đã được thông báo qua app)      │
└─────────────────────────────────────────┘
```

---

### Screen 5 — Sau khi Owner xác nhận

Organizer thấy nút thanh toán:

```
┌─────────────────────────────────────────┐
│  Giải bóng đá mùa hè 2026              │
│  ✅ Owner đã xác nhận                   │
│                                         │
│  Tổng tiền: 2,100,000đ                  │
│  Hạn thanh toán: 21/05/2026 06:00       │
│                                         │
│         [Thanh toán ZaloPay]            │
└─────────────────────────────────────────┘
```

→ Gọi `GET /payments/zalopay/tournament/{id}` → nhận `order_url` → redirect/webview

---

## Lưu ý kỹ thuật cho FE

### 1. Lấy round_id
`round_id` trả về trong response của `POST /tournaments/v2` tại `data.rounds[i].id`. FE cần lưu toàn bộ mảng này để biết `round_id` của từng vòng.

### 2. Xử lý lỗi SLOT_CONFLICT (409)
Khi user submit slot nhưng bị conflict (slot vừa bị người khác đặt trước), FE cần:
1. Hiển thị thông báo lỗi rõ ràng
2. Gọi lại `GET available-slots` để refresh danh sách
3. Yêu cầu user chọn lại

### 3. Format time
- Tất cả `start_time`, `end_time` trong request đều dùng format `HH:MM:SS` (string)
- Không dùng ISO datetime, không dùng Unix timestamp

### 4. Kiểm tra số slot cần chọn
Luôn dùng `data.slots_needed` từ response của `GET available-slots` để biết còn phải chọn bao nhiêu. Không tự tính phía FE.

### 5. Unlock vòng tiếp theo
Sau khi `POST /schedule` thành công (status 200), cập nhật UI để unlock vòng tiếp theo:
- Round vừa schedule: `status = "scheduled"` → hiện ✅
- Round tiếp theo: `status = "pending"` → hiện nút `[Chọn slot]`

### 6. Polling / Realtime cho Owner confirm
Backend gửi notification khi tất cả vòng scheduled. FE có thể dùng polling hoặc websocket để detect khi `booking.status` chuyển sang `confirmed` và hiển thị nút thanh toán.