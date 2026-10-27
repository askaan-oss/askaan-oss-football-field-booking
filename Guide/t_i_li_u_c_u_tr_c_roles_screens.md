# ĐẶC TẢ CHI TIẾT CÁC VAI TRÒ (ROLES) & MÀN HÌNH (SCREENS) HỆ THỐNG

> **Dự án:** Hệ thống Quản lý và Đặt sân bóng đá mini cỏ nhân tạo  
> **Nền tảng:** Web (React.js) & Mobile App (Flutter) & Backend RESTful API (Node.js/Express + MySQL)  
> **Căn cứ chuẩn hóa:** [`Guide/Document.md`](file:///d:/vsXanh/football-field-booking/Guide/Document.md) và [`Guide/map.md`](file:///d:/vsXanh/football-field-booking/Guide/map.md)

---

## PHẦN I. TỔNG QUAN PHÂN QUYỀN (ROLES OVERVIEW)

Hệ thống được thiết kế và vận hành với **3 vai trò người dùng chính thức** và **1 chế độ khách vãng lai (Guest Mode)**:

```text
[ HỆ THỐNG QUẢN LÝ & ĐẶT SÂN BÓNG ĐÁ ]
│
├── 1. ROLE: ADMIN (Chủ sân / Quản trị viên hệ thống)
│   ├── Nền tảng: Web React.js (Desktop Dashboard) & Mobile App Flutter (Mobile Dashboard điều hành)
│   └── Quyền hạn: Giám sát doanh thu hôm nay & 7 ngày, quản trị hạ tầng sân bóng (5/7 người), bật/tắt bảo trì từ xa,
│                  duyệt/từ chối đơn đặt tức thì, cấu hình biểu giá 4 ca & cuối tuần, xếp ca trực nhân viên, quản lý dịch vụ.
│
├── 2. ROLE: STAFF (Nhân viên vận hành / Lễ tân trực quầy)
│   ├── Nền tảng: Web React.js (Desktop / Tablet trực quầy)
│   └── Quyền hạn: Theo dõi sơ đồ ma trận lịch sân 30 phút, tạo đơn tại quầy (khách vãng lai),
│                  duyệt đơn online, check-in đón khách qua mã ID/chuỗi QR, gọi thêm nước, cập nhật cọc/thanh toán.
│
├── 3. ROLE: CUSTOMER (Khách hàng đã đăng nhập)
│   ├── Nền tảng: Mobile App Flutter (Android / iOS) & Web Client
│   └── Quyền hạn: Tra cứu ma trận lịch trống, đặt sân theo khung giờ & thời lượng, nhận vé điện tử (#ID)
│                  kèm mã QR check-in, theo dõi 5 trạng thái đơn, hủy vé chủ động, chấm sao đánh giá sau trận.
│
└── 4. GUEST (Khách vãng lai chưa đăng nhập)
    ├── Nền tảng: Mobile App Flutter & Web Client
    └── Quyền hạn: Mở ứng dụng vào thẳng trang chủ, lọc sân 5 / sân 7 / toàn hệ thống, 
                   xem gallery ảnh sân, bảng giá và nhận xét (chỉ đọc). Yêu cầu đăng nhập khi bấm đặt sân hoặc xem vé.
```

---

## PHẦN II. MA TRẬN MÀN HÌNH VÀ CHỨC NĂNG THEO TỪNG VAI TRÒ

---

### 1. VAI TRÒ: ADMIN (QUẢN TRỊ VIÊN HỆ THỐNG / CHỦ SÂN)
* **Nền tảng:** Web React.js (Nền tảng quản trị đầy đủ) & Mobile App Flutter (Mobile Dashboard điều hành nhanh cho Chủ sân)
* **File Component Web chính:** [`frontend/src/pages/AdminDashboard.jsx`](file:///d:/vsXanh/football-field-booking/frontend/src/pages/AdminDashboard.jsx) và [`frontend/src/pages/LoginPage.jsx`](file:///d:/vsXanh/football-field-booking/frontend/src/pages/LoginPage.jsx)
* **File Màn hình Mobile chính:** [`mobile_app/lib/screens/admin_dashboard_screen.dart`](file:///d:/vsXanh/football-field-booking/mobile_app/lib/screens/admin_dashboard_screen.dart), [`admin_bookings_screen.dart`](file:///d:/vsXanh/football-field-booking/mobile_app/lib/screens/admin_bookings_screen.dart), [`admin_pitches_screen.dart`](file:///d:/vsXanh/football-field-booking/mobile_app/lib/screens/admin_pitches_screen.dart)

#### A. Giao diện Web Admin Dashboard (React.js)
| Tên màn hình / Tab | File Component nguồn | Thành phần giao diện & Chức năng chi tiết thực tế |
| :--- | :--- | :--- |
| **Đăng nhập quản trị** | `frontend/src/pages/LoginPage.jsx` | - Form đăng nhập nội bộ (Username & Password).<br>- Tự động phân luồng: Điều hướng sang `/admin` nếu tài khoản có role `admin`. |
| **Tab 1: Tổng quan & Báo cáo** | `AdminDashboard.jsx`<br>(`activeTab === 'overview'`) | - **Thẻ tóm tắt doanh số linh hoạt (Quick Revenue Cards):** Bộ lọc 5 chế độ: Hôm nay, Theo Ngày, Theo Tháng, Theo Năm, Tất cả.<br>- 4 Thẻ KPI động: Doanh thu, Lượt đặt sân, Trận đã hoàn tất, Doanh thu TB/lượt.<br>- Thanh tổng quan: Tổng doanh thu tích lũy toàn hệ thống & số đơn chờ duyệt.<br>- Thanh chọn thứ trong tuần (Thứ 2 - Chủ Nhật) & bộ lọc thao tác đơn nhanh (duyệt, check-in, hoàn tất, hủy). |
| **Tab 2: Quản lý Sân bóng** | `AdminDashboard.jsx`<br>(`activeTab === 'pitches'`) | - Lưới danh thiếp sân bóng (phân loại Sân 5 người / Sân 7 người).<br>- Hiển thị đơn giá cơ bản (`price_default`), điểm sao đánh giá TB và trạng thái (Hoạt động / Bảo trì).<br>- Nút gạt chuyển trạng thái: `Hoạt động` $\longleftrightarrow$ `Bảo trì` (`PATCH /api/pitches/:id/status`). Khi bảo trì, hệ thống tự khóa lịch sân.<br>- Nút mở Modal quản lý Album ảnh phụ (Gallery).<br>- Nút xóa sân bóng kèm xác nhận an toàn (`DELETE /api/pitches/:id`).<br>- Form thêm sân bóng mới: Tên sân, Loại sân (5 hoặc 7 người), Giá gốc/giờ, Mô tả mặt cỏ/đèn, Chọn file ảnh đại diện (`avatar`) tải lên server qua Multer. |
| **Modal: Quản lý Gallery ảnh sân** | `AdminDashboard.jsx`<br>(`galleryModal`) | - Xem danh sách toàn bộ ảnh chụp chi tiết các góc của sân bóng.<br>- Nút chọn ảnh từ máy tính để upload bổ sung vào thư mục tĩnh `/uploads/`.<br>- Nút xóa từng ảnh phụ khỏi thư viện của sân. |
| **Tab 3: Cấu hình Khung giờ & Biểu giá** | `AdminDashboard.jsx`<br>(`activeTab === 'timerules'`) | - Bảng cấu hình quy tắc 4 ca trong ngày:<br>  + Ca 1: Sáng sớm (05:00 - 08:00)<br>  + Ca 2: Sáng chính (08:00 - 11:00)<br>  + Ca 3: Chiều (14:00 - 17:00)<br>  + Ca 4: Giờ vàng tối (17:00 - 23:00).<br>- Cột hệ số giá ngày thường (`price_multiplier`).<br>- Cột hệ số giá cuối tuần Thứ 7, Chủ Nhật (`weekend_multiplier`).<br>- Form cập nhật hệ số giá cho từng ca (`PUT /api/pitches/time-rules/:id`). |
| **Tab 4: Quản lý Nhân sự & Phân ca** | `AdminDashboard.jsx`<br>(`activeTab === 'staff'`) | - Danh sách tài khoản nhân viên trực ban: Họ tên, Tên đăng nhập, Ca trực được phân công, Trạng thái tài khoản.<br>- Bộ chọn/phân công ca trực linh hoạt: Ca sáng, Ca chiều, Ca tối, Ca đêm hoặc Vắng mặt/Nghỉ.<br>- Nút xóa tài khoản nhân viên (`DELETE /api/auth/staff/:id`).<br>- Form cấp tài khoản nhân viên mới: Họ tên, Tên đăng nhập, Mật khẩu khởi tạo, Chọn ca trực ban đầu. |
| **Tab 5: Quầy Dịch vụ & Tiện ích** | `AdminDashboard.jsx`<br>(`activeTab === 'services'`) | - Danh mục dịch vụ quầy: Nước giải khát, bóng thi đấu, áo pitch, thuê trọng tài...<br>- Xem đơn vị tính (chai, lon, bộ, lượt) và đơn giá niêm yết.<br>- Nút xóa mặt hàng dịch vụ (`DELETE /api/services/:id`).<br>- Form thêm mới dịch vụ vào quầy (`POST /api/services`). |
| **Tab 6: Kiểm duyệt Đánh giá** | `AdminDashboard.jsx`<br>(`activeTab === 'reviews'`) | - Danh sách toàn bộ đánh giá của khách hàng gửi về: Tên sân, Người đánh giá, Số sao (1 đến 5 ⭐), Nội dung nhận xét, Ngày gửi.<br>- Nút xóa các bình luận tiêu cực, spam hoặc không đúng chuẩn mực (`DELETE /api/pitches/reviews/:id`). |

#### B. Giao diện Mobile Admin Dashboard (Flutter App)
| Tên màn hình Mobile | File Code nguồn | Thành phần giao diện & Chức năng chi tiết thực tế |
| :--- | :--- | :--- |
| **Tab Quản trị & Điều phối** | `mobile_app/lib/screens/main_tab_screen.dart` | - Khi tài khoản có role `admin` đăng nhập:<br>  + Thanh BottomNavigationBar mở khóa thêm **Tab 2: Quản trị** (`AdminDashboardScreen`).<br>  + **Tự động thay Tab "Vé của tôi" thành Tab "Quản lý đơn"** (`AdminBookingsScreen`) chuyên dụng cho Chủ sân.<br>  + Tại Tab Tài khoản: Hiển thị Card banner **"BẢNG ĐIỀU HÀNH CHỦ SÂN"** truy cập 1 chạm. |
| **1. Mobile Admin Dashboard** | `mobile_app/lib/screens/admin_dashboard_screen.dart` | - **Thẻ tóm tắt doanh số linh hoạt (Quick Revenue Cards):** Bộ lọc 5 chế độ: **Hôm nay**, **Theo Ngày** (DatePicker), **Theo Tháng** (chọn Tháng/Năm), **Theo Năm**, **Tất cả**.<br>- 4 Thẻ KPI động nhảy số theo thời gian chọn: Doanh thu, Lượt đặt sân, Trận hoàn tất, Doanh thu TB/đơn.<br>- **Biểu đồ cột 7 ngày:** Biểu đồ doanh thu tuần gần nhất trực quan bằng Animated Container.<br>- **Phân tích trạng thái:** Thanh tiến độ tỷ lệ 5 trạng thái đơn (Chờ duyệt, Đã duyệt, Đang đá, Hoàn tất, Hủy).<br>- **Duyệt nhanh đơn Pending:** Danh sách các đơn chờ duyệt mới nhất kèm nút bấm **"Duyệt đơn"** (`PATCH /api/bookings/:id/status`) và **"Từ chối"** trực tiếp trên điện thoại.<br>- **Ca trực ban:** Nút mở xem danh sách nhân viên trực ban hôm nay (`/api/auth/staff`). |
| **2. Quản lý Đơn đặt trên Mobile** | `mobile_app/lib/screens/admin_bookings_screen.dart` | - Danh sách toàn bộ đơn đặt sân trong hệ thống.<br>- **Bộ lọc theo ngày đá:** Thanh chọn ngày linh hoạt gồm: "Tất cả ngày", "Hôm nay", "Ngày mai" và "Chọn ngày..." (mở DatePicker chọn bất kỳ ngày nào).<br>- **Tìm kiếm:** Tìm nhanh theo Tên khách, SĐT, Mã đơn (#ID), Tên sân.<br>- **Lọc trạng thái:** 6 FilterChip (Tất cả, Chờ duyệt, Đã duyệt, Đang đá, Hoàn tất, Đã hủy).<br>- **Thao tác đơn theo vòng đời:**<br>  + Đơn chờ duyệt: Duyệt đơn (`confirmed`), Từ chối (`cancelled`).<br>  + Đơn đã duyệt: Vào đá (`checked_in`), Hủy đơn (`cancelled`).<br>  + **Đơn đang đá: Hoàn thành đơn** (`completed`) kèm hộp thoại xác nhận kết thúc trận đấu. |
| **3. Giám sát & Bảo trì Sân Mobile** | `mobile_app/lib/screens/admin_pitches_screen.dart` | - Danh sách toàn bộ các sân bóng thuộc hệ thống (Sân 5 người / Sân 7 người).<br>- Hiển thị loại sân, đơn giá cơ bản và trạng thái hiện tại (Đang hoạt động / Đang bảo trì).<br>- **Công tắc bảo trì tức thì:** Switch gạt Bật/Tắt chế độ bảo trì sân (`PATCH /api/pitches/:id/status`). Khi gạt bảo trì, hệ thống tự động khóa lịch tức thời, chống nhận khách. |

---

### 2. VAI TRÒ: STAFF (NHÂN VIÊN LỄ TÂN TRỰC QUẦY)
* **Nền tảng:** Web React.js
* **File Component chính:** [`frontend/src/pages/StaffDashboard.jsx`](file:///d:/vsXanh/football-field-booking/frontend/src/pages/StaffDashboard.jsx) và [`frontend/src/pages/LoginPage.jsx`](file:///d:/vsXanh/football-field-booking/frontend/src/pages/LoginPage.jsx)

| Tên màn hình / Khối chức năng | File Component nguồn | Thành phần giao diện & Chức năng chi tiết thực tế |
| :--- | :--- | :--- |
| **Đăng nhập nhân viên** | `frontend/src/pages/LoginPage.jsx` | - Đăng nhập tài khoản nhân viên do Admin cấp.<br>- Hệ thống tự động chuyển hướng vào giao diện trực ban `/staff`. |
| **Thanh thông tin ca trực** | `StaffDashboard.jsx`<br>(Header) | - Hiển thị Họ tên nhân viên đang trực ban và Ca trực được phân công trong ngày.<br>- Cảnh báo trực quan nếu ca làm việc hiện tại vắng người trực.<br>- Nút Đăng xuất tài khoản an toàn. |
| **Ma trận Timeline lịch sân 30 phút** | `StaffDashboard.jsx`<br>(`activeTab === 'schedule'`) | - Bộ chọn ngày xem lịch.<br>- Bảng ma trận thời gian từ 05:00 đến 23:00 chia mốc chẵn 30 phút cho tất cả các sân.<br>- Màu sắc trực quan theo 5 trạng thái:<br>  + Màu xanh lá: Khung giờ còn trống (Available)<br>  + Màu vàng cam: Đơn đặt online chờ duyệt (Pending)<br>  + Màu xanh ngọc: Đơn đã xác nhận (Confirmed)<br>  + Màu xanh cyan: Đang thi đấu trên sân (Checked-in)<br>  + Màu xám sọc: Sân đang tạm dừng để bảo trì (Maintenance).<br>- Chạm vào ô giờ để xem nhanh chi tiết hoặc mở thao tác đơn. |
| **Khung Check-in nhanh đón khách** | `StaffDashboard.jsx`<br>(`Check-in Box`) | - Ô input nhập mã vé rút gọn (`#ID`, ví dụ: `12`) hoặc chuỗi mã QR (`BOOKING_12`).<br>- Nút bấm **"Check-in Vào Sân"**: Tự động tìm đơn và chuyển trạng thái sang `checked_in`. |
| **Modal: Đặt sân tại quầy (Desk Booking)** | `StaffDashboard.jsx`<br>(`deskModal`) | - Tiếp nhận khách vãng lai gọi điện hoặc đến trực tiếp tại quầy.<br>- Form nhập: Họ tên khách hàng, Số điện thoại, Ghi chú đặc biệt.<br>- Chọn sân bóng, ngày đá, giờ bắt đầu và giờ kết thúc (hệ thống tự động tính tiền theo biểu giá ca và cuối tuần).<br>- Chọn đồ uống/dịch vụ ban đầu.<br>- Ghi nhận hình thức thanh toán/cọc ban đầu (Tiền mặt hoặc Chuyển khoản) và trạng thái thanh toán. |
| **Modal: Chi tiết đơn & Gọi thêm dịch vụ** | `StaffDashboard.jsx`<br>(`actionModal`) | - Xem thông tin người đặt, ngày giờ thi đấu, đơn giá sân.<br>- Nút thao tác chuyển trạng thái đơn: **Duyệt đơn** (`confirmed`), **Check-in** (`checked_in`), **Hoàn tất** (`completed`), **Hủy đơn** (`cancelled`).<br>- Khu vực gọi nước/tiện ích phát sinh trong trận: Dropdown chọn món, nhập số lượng $\rightarrow$ Bấm **"Thêm vào đơn"** (tự động cộng dồn vào tổng tiền hóa đơn qua `/api/services/order`).<br>- Cập nhật trạng thái thanh toán: `Chưa thanh toán` $\longleftrightarrow$ `Đã cọc` $\longleftrightarrow$ `Đã thanh toán 100%`. |
| **Tab: Quản lý ảnh thực tế sân** | `StaffDashboard.jsx`<br>(`activeTab === 'gallery'`) | - Hỗ trợ nhân viên trực quầy upload ảnh chụp thực tế tình trạng mặt sân lên hệ thống. |
| **Tab: Xem phản hồi khách hàng** | `StaffDashboard.jsx`<br>(`activeTab === 'reviews'`) | - Xem danh sách khách hàng vừa hoàn tất trận đấu gửi đánh giá sao và nhận xét về cơ sở vật chất. |

---

### 3. VAI TRÒ: CUSTOMER (KHÁCH HÀNG ĐẶT SÂN)
* **Nền tảng:** Mobile App Flutter (`mobile_app/`) và Web Client (`frontend/src/pages/`)
* **Thư mục mã nguồn:** [`mobile_app/lib/screens/`](file:///d:/vsXanh/football-field-booking/mobile_app/lib/screens/)

| Tên màn hình | File Code nguồn | Thành phần giao diện & Chức năng chi tiết thực tế |
| :--- | :--- | :--- |
| **1. Trang Chủ Sân Bóng** | `lib/screens/home_screen.dart`<br>(Web: `HomePage.jsx`) | - **Header:** Tên người dùng / "Khách vãng lai", Nút Đăng nhập/Đăng xuất.<br>- **Bộ lọc loại sân:** ChoiceChip chọn xem: **Toàn hệ thống**, **Sân 5 người**, **Sân 7 người**.<br>- **Danh sách thẻ sân bóng:** Ảnh đại diện sân, Tên sân, Đơn giá cơ bản/giờ, Số sao đánh giá trung bình và số lượt review, Tag trạng thái bảo trì nếu có.<br>- **Thao tác:** Chạm vào thẻ sân để mở Chi tiết sân; hoặc bấm nút **"Đặt Sân Ngay"** trên thẻ. |
| **2. Chi Tiết Sân Bóng** | `lib/screens/pitch_detail_screen.dart`<br>(Web: `PitchDetailModal.jsx`) | - **Gallery ảnh mô tả:** Vuốt ngang (`PageView` kèm indicator dots) xem các góc chụp thực tế.<br>- **Thông số sân:** Tên sân, Tag loại sân (Sân 5 / Sân 7), Giá cơ bản/giờ, Đánh giá sao trung bình.<br>- **Mô tả sân:** Đặc điểm mặt cỏ FIFA, hệ thống chiếu sáng LED, lưới chắn.<br>- **Đánh giá & Nhận xét:** Danh sách phản hồi thực tế từ những người đã đá.<br>- **Nút "📅 ĐẶT SÂN NGAY":**<br>  + Nếu chưa đăng nhập: Hiển thị thông báo, tự động mở màn hình Đăng nhập; đăng nhập thành công sẽ mở tiếp màn hình Chọn giờ của chính sân này.<br>  + Nếu đã có token đăng nhập: Mở ngay màn hình Chọn giờ & Đặt sân.<br>  + Nếu sân đang bảo trì: Nút chuyển thành "SÂN ĐANG BẢO TRÌ" và bị vô hiệu hóa. |
| **3. Đăng Nhập & Đăng Ký** | `lib/screens/login_screen.dart`<br>& `register_screen.dart`<br>(Web: `CustomerAuthPage.jsx`) | - **Đăng nhập:** Nhập Số điện thoại (hoặc Username) và Mật khẩu (hỗ trợ Universal Login cho cả tài khoản test Admin/Staff).<br>- **Đăng ký:** Form nhập Số điện thoại, Họ tên, Mật khẩu.<br>- Lưu Token JWT và thông tin người dùng an toàn vào `SharedPreferences`.<br>- Hỗ trợ tham số `onSuccess`: Tự động quay lại luồng đặt sân đang dở sau khi đăng nhập. |
| **4. Chọn Giờ & Đặt Sân** | `lib/screens/booking_screen.dart`<br>(Web: `CustomerBookingPage.jsx`) | - **Thanh chọn ngày đá:** Chọn ngày từ hôm nay trở đi (chặn chọn ngày trong quá khứ).<br>- **Lưới khung giờ 30 phút:** Tải ma trận tình trạng sân theo ngày: ô xám (đã kín), ô xanh (còn trống).<br>- **Chọn thời lượng đá:** Dropdown chọn 60 phút (1 tiếng), 90 phút (1.5 tiếng), 120 phút (2 tiếng).<br>- **Tính tiền tự động:** Chia block 30p, nhân hệ số ca trong ngày, nhân hệ số ngày cuối tuần Thứ 7/Chủ Nhật, hiển thị tổng tiền ngay lập tức.<br>- **Ghi chú:** Ô nhập lời nhắn cho chủ sân.<br>- **Nút "XÁC NHẬN ĐẶT SÂN":** Gửi `POST /api/bookings/online` (kiểm tra 5 quy tắc nghiệp vụ BR-01 -> BR-05). Đặt thành công hiển thị popup và chuyển sang tab "Vé Của Tôi". |
| **5. Vé Của Tôi & Lịch Sử** | `lib/screens/my_bookings_screen.dart`<br>(Web: `CustomerHistoryPage.jsx`) | - **Bộ lọc trạng thái:** Thanh FilterChip 6 mục: Tất cả, Chờ duyệt, Đã duyệt, Đang đá, Hoàn tất, Hủy.<br>- **Thẻ vé điện tử chuẩn:**<br>  + Header vé: Mã vé rút gọn `#ID` (VD: `VÉ ĐIỆN TỬ #12`) kèm Tag trạng thái có màu sắc riêng.<br>  + Thân vé: Mã QR Code điện tử (`qr_flutter`) chứa chuỗi `BOOKING_<ID>` dùng quét check-in tại quầy, Tên sân, Ngày đá, Khung giờ bắt đầu - kết thúc, Tổng tiền, Trạng thái thanh toán (`Chưa thanh toán`, `Đã cọc`, `Đã thanh toán`).<br>  + Đuôi vé: Nút **"Hủy vé"** (cho phép hủy khi đơn còn `Chờ duyệt` hoặc `Đã duyệt` kèm popup xác nhận an toàn); Nút **"⭐ Đánh giá"** (hiển thị khi đơn ở trạng thái `Hoàn tất` để mở modal chấm 1-5 sao và viết nhận xét). |
| **6. Hồ Sơ Tài Khoản** | `lib/screens/main_tab_screen.dart`<br>(Tab `ProfileTab`) | - Hiển thị Avatar, Họ tên, Tag vai trò người dùng.<br>- Hiển thị Số điện thoại và Tên đăng nhập.<br>- Nút **"Đăng xuất tài khoản"** kèm hộp thoại xác nhận an toàn. |
| **7. Chi Tiết Vé Điện Tử** | `lib/screens/ticket_detail_screen.dart` | - Mở khi chạm vào thẻ vé hoặc nút **"Xem Chi Tiết Vé & Dịch Vụ >"**.<br>- **Thẻ Boarding Pass thể thao:** Hiển thị Mã vé `#ID`, Tên sân, Loại sân (5 hoặc 7 người), Ngày đá, Giờ bắt đầu - Giờ kết thúc.<br>- **Mã QR Code phóng to:** Chứa chuỗi `BOOKING_<ID>` sắc nét giúp nhân viên trực quầy quét máy mã vạch hoặc camera check-in tức thì.<br>- **Bảng kê dịch vụ phát sinh:** Liệt kê chi tiết từng món đồ uống/tiện ích do lễ tân thêm vào đơn (Tên món, số lượng, đơn giá, thành tiền).<br>- **Bảng tổng hợp chi phí:** Tiền sân ban đầu, Tiền dịch vụ gọi thêm, Tổng tiền thanh toán (`final_amount`) và Trạng thái thanh toán (`Chưa thanh toán` / `Đã cọc` / `Đã thanh toán`).<br>- **Thao tác tức thời:** Nút **"Hủy Vé"** (cho đơn chờ duyệt/đã duyệt); Nút **"⭐ Đánh Giá Sân"** (cho đơn đã hoàn tất). |

---

### 4. VAI TRÒ: GUEST (KHÁCH VÃNG LAI CHƯA ĐĂNG NHẬP)
* **Nền tảng:** Mobile App Flutter (`mobile_app/`) & Web Client (`frontend/`)
* **Phạm vi truy cập và điểm kiểm soát:**
  * **Trang chủ:** Được mở app vào thẳng danh sách sân bóng, lọc theo Sân 5 / Sân 7 / Toàn hệ thống.
  * **Chi tiết sân:** Được xem album ảnh gallery, đơn giá cơ bản, mô tả mặt cỏ, dàn đèn và danh sách nhận xét đánh giá từ người dùng trước.
  * **Tab Vé của tôi:** Khi bấm vào, hiển thị màn hình giao diện nhắc nhở `GuestPromptTab` ("Bạn đang là Khách vãng lai, vui lòng đăng nhập để xem danh sách vé điện tử...") kèm nút "ĐĂNG NHẬP NGAY".
  * **Tab Tài khoản:** Hiển thị `GuestProfileTab` thông báo chưa kích hoạt tài khoản kèm thông tin Hotline hỗ trợ hệ thống.
  * **Điểm chặn xác thực (Auth Guard):** Khi khách vãng lai bấm nút **"Đặt Sân Ngay"**, ứng dụng lập tức hiển thị thông báo yêu cầu đăng nhập và chuyển hướng sang `LoginScreen`. Sau khi đăng nhập thành công, app tự động mở tiếp màn hình Chọn giờ & Đặt sân của chính sân bóng vừa chọn mà không bắt khách phải tìm lại.

---

## PHẦN III. BẢNG TỔNG HỢP PHÂN BỔ API ENDPOINTS THEO ROLES

Bảng ánh xạ chuẩn xác 100% giữa API Endpoint thực tế tại Backend với các Roles được phép truy cập:

| Phân hệ API | Tuyến đường Endpoint | Phương thức | Roles được phép gọi | Chức năng thực tế trong Code |
| :--- | :--- | :---: | :--- | :--- |
| **Xác thực** | `/api/auth/customer/register` | `POST` | Công khai (Guest / Khách mới) | Khách hàng đăng ký tài khoản mới bằng SĐT + Mật khẩu |
| | `/api/auth/customer/login` | `POST` | Công khai | Đăng nhập tài khoản khách hàng (hỗ trợ Universal Login) |
| | `/api/auth/login` | `POST` | Nội bộ (Admin, Staff) | Đăng nhập tài khoản nhân viên và quản trị viên |
| | `/api/auth/profile` hoặc `/me` | `GET` | Đã đăng nhập (`verifyToken`) | Lấy thông tin tài khoản hiện tại từ Token |
| | `/api/auth/staff` | `GET` | Admin, Staff | Lấy danh sách toàn bộ nhân viên và ca trực |
| | `/api/auth/staff` (hoặc `/create-staff`) | `POST` | Admin | Quản trị viên tạo tài khoản nhân viên mới |
| | `/api/auth/staff/:id/shift` | `PATCH` | Admin | Quản trị viên cập nhật ca trực ban cho nhân viên |
| | `/api/auth/staff/:id` | `DELETE` | Admin | Quản trị viên xóa tài khoản nhân viên |
| **Sân bóng** | `/api/pitches` | `GET` | Công khai | Lấy danh sách sân bóng kèm sao TB và số review (lọc type=5/7) |
| | `/api/pitches/:id` | `GET` | Công khai | Lấy thông tin chi tiết sân + album ảnh gallery + danh sách review |
| | `/api/pitches` | `POST` | Admin | Thêm sân bóng mới kèm upload ảnh đại diện qua Multer (`avatar`) |
| | `/api/pitches/:id` | `PUT` | Admin | Cập nhật thông tin sân bóng và đổi ảnh đại diện |
| | `/api/pitches/:id/status` | `PATCH` | Admin | Bật / Tắt chế độ bảo trì sân (`active` $\longleftrightarrow$ `maintenance`) |
| | `/api/pitches/:id` | `DELETE` | Admin | Xóa sân bóng khỏi hệ thống |
| | `/api/pitches/:id/images` | `POST` | Admin, Staff | Upload thêm ảnh chụp chi tiết vào album Gallery của sân |
| | `/api/pitches/:id/images/:imageId` | `DELETE` | Admin, Staff | Xóa ảnh phụ khỏi Gallery sân |
| **Biểu giá ca** | `/api/pitches/time-rules` | `GET` | Công khai | Lấy danh sách 4 ca hoạt động và hệ số ngày thường/cuối tuần |
| | `/api/pitches/time-rules/:id` | `PUT` | Admin | Cấu hình hệ số giá ngày thường & cuối tuần cho từng ca |
| **Đặt sân** | `/api/bookings/check-availability` | `GET` | Công khai | Tra cứu ma trận lịch sân theo ngày (từng block 30 phút) |
| | `/api/bookings/online` | `POST` | Customer (Đã có Token) | Khách hàng đặt sân online (kiểm tra BR-01 -> BR-05, tính tiền động) |
| | `/api/bookings/desk` | `POST` | Staff, Admin | Nhân viên tạo đơn đặt tại quầy cho khách vãng lai |
| | `/api/bookings` | `GET` | Staff, Admin | Lấy danh sách toàn bộ đơn đặt sân (hỗ trợ lọc ngày & trạng thái) |
| | `/api/bookings/my` | `GET` | Customer (Đã có Token) | Khách hàng xem danh sách vé / đơn đặt của chính mình |
| | `/api/bookings/:id` | `GET` | Đã đăng nhập (`verifyToken`) | Xem chi tiết thông tin đơn đặt sân và dịch vụ phát sinh |
| | `/api/bookings/:id/status` | `PATCH` | Staff, Admin | Chuyển đổi trạng thái đơn (Pending -> Confirmed -> Completed) |
| | `/api/bookings/:id/checkin` | `PATCH` | Staff, Admin | Xác nhận Check-in đón khách vào sân (chuyển sang `checked_in`) |
| | `/api/bookings/:id/payment` | `PATCH` | Staff, Admin | Cập nhật tình trạng thanh toán: `unpaid` -> `deposited` -> `paid` |
| | `/api/bookings/:id/cancel` | `PATCH` | Customer, Staff, Admin | Khách hàng hoặc nhân viên hủy vé đặt sân |
| **Dịch vụ quầy** | `/api/services` | `GET` | Công khai / Staff | Lấy menu danh mục nước uống và dịch vụ đi kèm |
| | `/api/services` | `POST` | Admin | Thêm mới mặt hàng dịch vụ vào quầy |
| | `/api/services/:id` | `DELETE` | Admin | Xóa mặt hàng dịch vụ khỏi quầy |
| | `/api/services/order` | `POST` | Đã đăng nhập (`verifyToken`) | Gọi thêm nước uống/dịch vụ phát sinh vào đơn đang thi đấu |
| | `/api/services/order/:bookingId` | `GET` | Đã đăng nhập (`verifyToken`) | Lấy danh sách các món dịch vụ đã dùng của một đơn đặt sân |
| **Đánh giá sân** | `/api/pitches/:id/reviews` | `POST` | Customer (Đã có Token) | Khách hàng gửi điểm sao (1-5 ⭐) và nhận xét sau trận đấu |
| | `/api/pitches/reviews` | `GET` | Staff, Admin | Xem toàn bộ đánh giá của khách hàng trên toàn hệ thống |
| | `/api/pitches/reviews/:reviewId` | `DELETE` | Admin | Quản trị viên xóa bình luận/đánh giá vi phạm |
