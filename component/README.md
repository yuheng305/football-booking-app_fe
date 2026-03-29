# Header Components

Hệ thống header chuẩn hóa cho toàn bộ ứng dụng.

## Components

### 1. UniversalHeader (Base Component)
Component cơ sở cho tất cả các header. Không nên dùng trực tiếp, hãy dùng các wrapper bên dưới.

### 2. HeaderUser
Header cho các trang của User (player).

**Props:**
- `title?: string` - Tiêu đề chính (tên trang)
- `subtitle?: string` - Phụ đề (tên user hoặc thông tin thêm)
- `showBackButton?: boolean` - Hiển thị nút back thay vì logo (default: false)

**Ví dụ:**
```tsx
<HeaderUser title="Tài khoản" subtitle={userName} />
<HeaderUser title="Lịch sử đặt sân" showBackButton={true} />
```

### 3. HeaderOwner
Header cho các trang của Owner (chủ sân).

**Props:**
- `title?: string` - Tiêu đề chính
- `subtitle?: string` - Phụ đề
- `showBackButton?: boolean` - Hiển thị nút back thay vì logo (default: false)

**Ví dụ:**
```tsx
<HeaderOwner title="Quản lý sân" subtitle={ownerName} />
<HeaderOwner title="Thêm sân mới" showBackButton={true} />
```

### 4. HeaderWithBack
Header với nút back (không có logo). Dùng cho các trang chi tiết/phụ.

**Props:**
- `title: string` - Tiêu đề (required)
- `subtitle?: string` - Phụ đề
- `onBack?: () => void` - Custom handler cho nút back

**Ví dụ:**
```tsx
<HeaderWithBack title="Chi tiết đặt sân" />
<HeaderWithBack 
  title="Xác nhận thanh toán" 
  subtitle="Bước 3/3"
  onBack={() => handleCustomBack()}
/>
```

## Migration từ props cũ

**Cũ (deprecated):**
```tsx
<HeaderUser location="Tài khoản" time={userName} />
```

**Mới (recommended):**
```tsx
<HeaderUser title="Tài khoản" subtitle={userName} />
```

## Theme

Tất cả headers sử dụng theme thống nhất:
- Background: `#1e3a5f` (xanh đậm)
- Text chính: `#93c5fd` (xanh nhạt)
- Text phụ: `#bfdbfe` (xanh rất nhạt)
