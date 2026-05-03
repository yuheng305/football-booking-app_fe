# UI Flow by Role

Sơ đồ dưới đây bám theo route và screen hiện có trong code. `organizer` được normalize sang nhánh tab để dùng luồng giải đấu, còn `owner` đi vào khu vực quản trị riêng.

```mermaid
flowchart TD
    A[Onboarding Screen] --> B[Login / Sign Up Screen]

    B --> P0["Player entry: tabs home"]
    B --> O0["Owner entry: owners home"]
    B --> G0["Organizer entry: tabs home"]

    subgraph PLAYER[Player]
        P0 --> P1[Tab Booking / Stadium]
        P0 --> P2[Tab Account]
        P0 --> P3[Tab Payment]

        P1 --> P1a[Club Selection Screen]
        P1a --> P1b[Map View and Cluster List Screen]
        P1b --> P1c[Date, Time and Field Selection Screen]
        P1c --> P1d[Booking Confirmation Screen]
        P1d --> P1e[Booking Detail Screen\nStatus: Pending Approval]
        P1e --> P1f[Payment Screen]
        P1f --> P1g[Booking Success Screen]

        P2 --> P2a[Change Password Screen]
        P3 --> P3a[Payment / Transaction History Screen]
    end

    subgraph OWNER[Owner]
        O0 --> O1[Cluster List Screen]
        O0 --> O2[Owner Booking Management Screen]
        O0 --> O3[Owner Account Profile Screen]

        O1 --> O1a[Cluster Detail Screen]
        O1a --> O1b[Create Cluster Screen]
        O1a --> O1c[Stadium Management Screen]
        O1c --> O1d[Add Field Screen]
        O1c --> O1e[Edit Field Screen]

        O2 --> O2a[Booking Detail Screen]
        O2 --> O2b[Tournament Detail Screen]

        O3 --> O3a[Change Password Screen]
    end

    subgraph ORGANIZER[Organizer]
        G0 --> G1[Tab Tournament]
        G0 --> G2[Tab Account]
        G0 --> G3[Tab Payment]

        G1 --> G1a[Tournament List Screen]
        G1a --> G1b[Tournament Detail Screen]
        G1b --> G1c[Select Club for Tournament Screen]
        G1c --> G1d[Registration Form Screen]
        G1d --> G1e[Registration Status Screen\nStatus: Pending]
        G1e --> G1f[Tournament Fee Payment Screen]
        G1f --> G1g[Registration Success Screen]

        G1a --> G1h[Create Tournament - Standard]
        G1h --> G1i[Venue Screen]
        G1i --> G1j[Schedule Screen]
        G1j --> G1k[Review Screen]

        G1a --> G1l[Create Tournament - Level 2]
        G1l --> G1m[Level 2 Create Screen]
        G1m --> G1n[Round Config Screen]
        G1n --> G1o[Rounds Screen]
        G1o --> G1p[Bracket / Slots Screens]

        G2 --> G2a[Change Password Screen]
        G3 --> G3a[Payment / Transaction History Screen]
    end
```

Nếu bạn muốn, tôi có thể tách tiếp thành 3 sơ đồ riêng kiểu “template image” để bạn paste thẳng vào tài liệu thiết kế hoặc README.