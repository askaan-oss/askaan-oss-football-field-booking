# Tài liệu Kiến trúc Chức năng Dự án (Functional Document)

## 1. Tổng quan Hệ thống (System Overview)
Hệ thống Quản lý và Đặt sân bóng đá mini được xây dựng theo kiến trúc Client - Server tập trung, kết nối thông qua giao thức RESTful API đồng bộ giữa 3 phân hệ chính:
- **Backend API:** Xây dựng trên nền tảng **Node.js** và **Express.js**, kết nối cơ sở dữ liệu quan hệ **MySQL** (qua thư viện `mysql2` connection pool).
- **Web Dashboard & Web Client:** Xây dựng bằng **React.js** (Vite), hỗ trợ giao diện quản trị dành cho Quản trị viên (Admin), giao diện điều hành dành cho Nhân viên trực quầy (Staff) và giao diện đặt sân cơ bản cho Khách hàng.
- **Mobile App:** Ứng dụng di động đa nền tảng xây dựng bằng **Flutter (Dart)**, sử dụng mô hình quản lý trạng thái `Provider`, kết nối mạng qua `Dio`. Phục vụ Khách hàng tra cứu sân, xem lịch trống, đặt sân tiện lợi; đồng thời tích hợp phân hệ **Admin Mobile Dashboard** dành riêng cho Chủ sân để giám sát doanh thu tức thì, duyệt nhanh đơn đặt và điều hành bảo trì sân từ xa.

Hệ thống tập trung giải quyết trọn vẹn nghiệp vụ quản lý sân bóng mini cỏ nhân tạo (sân 5 người và sân 7 người): cho phép khách vãng lai tra cứu thông tin sân, xem ma trận lịch trống 4 ca trong ngày, đặt sân theo khung giờ, cấp mã vé điện tử kèm mã QR check-in; đồng thời cung cấp công cụ cho nhân viên tiếp nhận đơn tại quầy, duyệt đơn, check-in đón khách, thêm dịch vụ phát sinh và hỗ trợ quản trị viên cấu hình biểu giá linh hoạt theo ca và ngày cuối tuần.

---

## 2. Danh sách Chức năng Backend (Backend Core Features)

### 2.1 Module Xác thực & Phân quyền (Auth & RBAC)
- [x] **Đăng ký tài khoản Khách hàng:** Khách hàng đăng ký tài khoản mới qua Số điện thoại, Họ tên và Mật khẩu (lưu trữ tại bảng `customers`).
- [x] **Đăng nhập phân quyền đa luồng:**
  - Tuyến đường đăng nhập nội bộ (`/api/auth/login`) dành cho Quản trị viên (`admin`) và Nhân viên vận hành (`staff`) thuộc bảng `users`.
  - Tuyến đường đăng nhập người dùng (`/api/auth/customer/login`) tích hợp cơ chế đăng nhập linh hoạt (Universal Login), hỗ trợ đăng nhập bằng Số điện thoại hoặc Tên đăng nhập.
- [x] **Mã hóa bảo mật mật khẩu:** Toàn bộ mật khẩu người dùng được băm một chiều an toàn bằng thuật toán `bcrypt` kèm salt trước khi lưu vào CSDL.
- [x] **Cấp phát và xác thực JWT Token:** Cấp phát Access Token chuẩn JSON Web Token (`jsonwebtoken`) có thời hạn xác thực (7 ngày đối với tài khoản nội bộ, 30 ngày đối với tài khoản khách hàng).
- [x] **Middleware bảo vệ Endpoint (Guards):**
  - `verifyToken`: Giải mã và xác thực chữ ký số của token truyền qua HTTP Header `Authorization: Bearer <token>`.
  - `requireRole`: Kiểm tra vai trò người dùng theo mô hình RBAC (`admin`, `staff`, `customer`), chặn truy cập trái phép với mã lỗi HTTP 403 Forbidden.
- [x] **Kiểm soát trạng thái tài khoản:** Kiểm tra cờ `is_active = 1` khi đăng nhập, ngăn chặn các tài khoản đang bị vô hiệu hóa truy cập hệ thống.
- [x] **Quản lý danh sách nhân viên:** Cho phép Admin tạo tài khoản nhân viên mới, phân bổ ca trực ban, cập nhật ca trực và xóa tài khoản nhân viên (`/api/auth/staff`).

### 2.2 Module Kiểm tra Lịch & Quy tắc Nghiệp vụ (Availability & Business Rules)
- [x] **Tra cứu ma trận lịch sân theo ngày:** API `GET /api/bookings/check-availability?date=YYYY-MM-DD` cung cấp dữ liệu tình trạng toàn bộ các sân theo từng block 30 phút, phân biệt rõ các trạng thái: Trống, Chờ duyệt, Đã duyệt, Đang đá, Bảo trì.
- [x] **Kiểm soát chặt chẽ 5 quy tắc nghiệp vụ đặt sân (Business Rules):**
  - `BR-BOOKING-01`: Tuyệt đối không cho phép tạo đơn đặt sân ở mốc thời gian trong quá khứ.
  - `BR-BOOKING-02`: Giờ bắt đầu (`start_time`) bắt buộc phải nhỏ hơn giờ kết thúc (`end_time`).
  - `BR-BOOKING-03`: Thời gian đặt phải nằm trong khung giờ mở cửa của sân: Ca sáng (05:00 - 11:00) và Ca chiều/tối (14:00 - 23:00); hệ thống tự động từ chối khung giờ nghỉ trưa (11:00 - 14:00).
  - `BR-BOOKING-04`: Chặn trùng lịch (Double Booking): Kiểm tra xung đột thời gian với các đơn đặt sân đang tồn tại trên cùng một sân (ngoại trừ các đơn đã hủy).
  - `BR-BOOKING-05`: Thời lượng đặt sân tối thiểu là 60 phút (1 tiếng) và các mốc giờ phải là bội số chẵn của 30 phút.
- [x] **Tính toán giá tiền tự động theo biểu giá động:**
  - Tính toán chi tiết từng block 30 phút dựa trên đơn giá cơ bản của sân (`price_default`).
  - Tự động áp dụng hệ số khung giờ (`price_multiplier`) theo 4 ca: Ca 1 (Sáng sớm: 05:00 - 08:00), Ca 2 (Sáng: 08:00 - 11:00), Ca 3 (Chiều: 14:00 - 17:00), Ca 4 (Giờ vàng tối: 17:00 - 23:00).
  - Tự động nhận diện ngày Thứ 7 và Chủ Nhật để nhân thêm hệ số cuối tuần (`weekend_multiplier`).

### 2.3 Module Quản lý Vòng đời Đặt sân (Booking Lifecycle)
- [x] **Đặt sân trực tuyến dành cho Khách hàng:** API `POST /api/bookings/online` tiếp nhận yêu cầu đặt sân, kiểm tra 5 quy tắc nghiệp vụ, tính tổng tiền và tạo đơn với trạng thái ban đầu là Chờ duyệt (`status = 'pending'`), Chưa thanh toán (`payment_status = 'unpaid'`).
- [x] **Đặt sân tại quầy dành cho Nhân viên/Admin:** API `POST /api/bookings/desk` hỗ trợ tạo đơn nhanh cho khách vãng lai, cho phép chọn dịch vụ đi kèm ban đầu và ghi nhận trạng thái thanh toán/tiền cọc trực tiếp.
- [x] **Truy xuất danh sách đơn đặt:**
  - `GET /api/bookings`: Dành cho nhân viên/quản trị viên xem toàn bộ danh sách đơn đặt, hỗ trợ lọc theo ngày và trạng thái.
  - `GET /api/bookings/my`: Dành cho khách hàng tra cứu lịch sử các đơn đặt của chính mình.
  - `GET /api/bookings/:id`: Xem thông tin chi tiết của một đơn đặt sân (thông tin sân, khách hàng, khung giờ, dịch vụ phát sinh, trạng thái).
- [x] **Chuyển đổi trạng thái đơn đặt sân:** Cập nhật trạng thái đơn qua API `PATCH /api/bookings/:id/status` theo vòng đời chuẩn:
  $$\text{Chờ duyệt (pending)} \longrightarrow \text{Đã duyệt (confirmed)} \longrightarrow \text{Đang đá (checked\_in)} \longrightarrow \text{Hoàn tất (completed)}$$
  (hoặc chuyển sang $\text{Đã hủy (cancelled)}$ khi có yêu cầu).
- [x] **Quy trình Check-in đón khách:** API `PATCH /api/bookings/:id/checkin` hỗ trợ nhân viên xác nhận khách vào sân thông qua mã số vé hoặc mã QR check-in.
- [x] **Cập nhật trạng thái thanh toán:** API `PATCH /api/bookings/:id/payment` ghi nhận tình trạng thanh toán: Chưa thanh toán (`unpaid`), Đã đặt cọc (`deposited`), Đã thanh toán 100% (`paid`).
- [x] **Hủy vé đặt sân chủ động:** Khách hàng có quyền hủy các đơn đặt đang ở trạng thái `pending` hoặc `confirmed` qua API `PATCH /api/bookings/:id/cancel`.

### 2.4 Module Quản lý Hạ tầng Sân bóng & Dịch vụ (Pitches & Services)
- [x] **Quản lý danh mục sân bóng:** Hỗ trợ CRUD sân bóng (Thêm sân, Xem chi tiết, Cập nhật thông tin, Xóa sân). Phân loại rõ sân 5 người và sân 7 người.
- [x] **Quản lý chế độ bảo trì sân bóng:** Bật/tắt trạng thái bảo trì (`status = 'maintenance'`). Khi sân đang bảo trì, hệ thống tự động khóa lịch và từ chối mọi yêu cầu đặt sân mới.
- [x] **Quản lý kho ảnh thực tế (Gallery):** Upload ảnh đại diện sân và album ảnh chi tiết của từng sân thông qua middleware `multer`, phục vụ file tĩnh qua đường dẫn `/uploads/`.
- [x] **Cấu hình hệ số biểu giá ca:** Cho phép Admin xem và cập nhật hệ số giá ngày thường (`price_multiplier`) và hệ số cuối tuần (`weekend_multiplier`) cho từng ca hoạt động trong bảng `time_slot_rules`.
- [x] **Quản lý dịch vụ đi kèm:** 
  - Khởi tạo và quản lý danh mục dịch vụ (nước suối, nước tăng lực, bóng thi đấu, áo bib, thuê trọng tài...).
  - Gán dịch vụ phát sinh vào đơn đặt sân (`/api/services/order`), tự động tính toán tổng tiền dịch vụ và cập nhật vào hóa đơn đơn đặt.
- [x] **Đánh giá & Nhận xét chất lượng sân:**
  - Khách hàng gửi điểm số đánh giá (1 đến 5 sao) và nhận xét sau khi hoàn tất trận đấu (`POST /api/pitches/:id/reviews`).
  - Hệ thống tự động tính điểm trung bình (`average_rating`) và tổng lượt đánh giá của từng sân bóng.
  - Ban quản lý xem danh sách toàn bộ phản hồi và có quyền xóa các đánh giá không phù hợp.

---

## 3. Phân quyền và Chức năng theo từng Vai trò (Role-based Features)

### 3.1 Role: Admin (Quản trị viên / Chủ sân)
- **Giao diện sử dụng:** 
  - **Web Admin Dashboard:** [`frontend/src/pages/AdminDashboard.jsx`](file:///d:/vsXanh/football-field-booking/frontend/src/pages/AdminDashboard.jsx) (Nền tảng quản trị đầy đủ).
  - **Mobile App Admin Dashboard:** [`mobile_app/lib/screens/admin_dashboard_screen.dart`](file:///d:/vsXanh/football-field-booking/mobile_app/lib/screens/admin_dashboard_screen.dart), [`admin_bookings_screen.dart`](file:///d:/vsXanh/football-field-booking/mobile_app/lib/screens/admin_bookings_screen.dart), [`admin_pitches_screen.dart`](file:///d:/vsXanh/football-field-booking/mobile_app/lib/screens/admin_pitches_screen.dart) (Điều hành nhanh trên điện thoại).
- **Các chức năng thực tế được phép thực hiện:**
  - **Giám sát Dashboard & Báo cáo tổng quan:**
    - **Thẻ tóm tắt doanh số linh hoạt (Quick Revenue Cards) đồng bộ trên cả Web & Mobile:** Bộ lọc 5 chế độ tính doanh thu theo **Hôm nay**, **Theo Ngày** bất kỳ, **Theo Tháng** (Tháng/Năm), **Theo Năm**, và **Toàn thời gian**. Cả 4 chỉ số (Doanh thu, Lượt đặt sân, Trận hoàn tất, Doanh thu TB/lượt) tự động tính toán và nhảy số tức thì.
    - Xem thống kê tổng doanh thu toàn hệ thống, doanh thu hôm nay, tổng số đơn đặt sân, số đơn chờ duyệt và tổng số sân đang vận hành.
    - Xem biểu đồ trực quan thể hiện biến động doanh thu 7 ngày gần nhất (hỗ trợ cả Web và Mobile App).
    - Xem tỷ lệ phân bổ các trạng thái đơn hàng (Chờ duyệt, Đã duyệt, Đang đá, Hoàn tất, Đã hủy).
  - **Điều hành di động dành cho Chủ sân (Mobile App):**
    - Mở khóa Tab "Quản trị" và chuyển đổi Tab "Vé của tôi" thành **"Quản lý đơn"** dành riêng cho Admin trên thanh điều hướng.
    - **Thẻ tóm tắt doanh số linh hoạt (Quick Revenue Cards):** Bộ lọc đa chế độ tính doanh thu theo **Hôm nay**, **Theo Ngày** bất kỳ, **Theo Tháng** (Tháng/Năm), **Theo Năm**, và **Toàn thời gian**. Các chỉ số (Doanh thu, Lượt đặt, Trận hoàn tất, Doanh thu TB/đơn) tự động nhảy số tức thì.
    - Quản lý toàn bộ đơn đặt trên hệ thống kèm **bộ lọc theo ngày đá** (Tất cả, Hôm nay, Ngày mai, Chọn ngày bất kỳ qua DatePicker) và bộ lọc 6 trạng thái.
    - Duyệt đơn (`confirmed`) hoặc Từ chối (`cancelled`) đơn đặt sân trực tiếp từ điện thoại.
    - **Hoàn thành đơn trực tiếp khi đang đá:** Thao tác chuyển đổi trạng thái từ Đang đá (`checked_in`) sang Hoàn tất (`completed`) ngay trên điện thoại khi trận đấu kết thúc.
    - Xem danh sách ca trực ban của nhân viên trong ngày.
    - Giám sát tình trạng các sân bóng và gạt Bật/Tắt chế độ bảo trì sân tức thì từ xa qua điện thoại.
  - **Quản trị hạ tầng sân bóng:**
    - Thêm sân bóng mới: Nhập tên sân, chọn loại sân (sân 5 hoặc sân 7), nhập đơn giá cơ bản (`price_default`), mô tả đặc điểm mặt cỏ và upload ảnh đại diện.
    - Cập nhật thông tin sân: Sửa tên, đổi loại sân, điều chỉnh đơn giá cơ bản, thay đổi ảnh đại diện.
    - Điều khiển trạng thái vận hành: Chuyển đổi trạng thái Hoạt động (`active`) hoặc Tạm dừng để bảo trì (`maintenance`).
    - Xóa sân bóng khỏi hệ thống (có kèm xác nhận an toàn).
    - Quản lý album ảnh phụ (Gallery): Xem danh sách ảnh chi tiết của sân, upload thêm ảnh mới hoặc xóa ảnh cũ.
  - **Cấu hình khung giờ và quy tắc biểu giá (Time Rules):**
    - Xem danh sách 4 ca vận hành trong ngày: Ca sáng sớm, Ca sáng chính, Ca chiều, Ca tối giờ vàng.
    - Tùy chỉnh hệ số giá ngày thường (`price_multiplier`) và hệ số ngày cuối tuần Thứ 7, Chủ Nhật (`weekend_multiplier`) cho từng ca để kích cầu hoặc tăng doanh thu giờ cao điểm.
  - **Quản lý nhân sự và xếp ca trực ban (Staff Management):**
    - Tạo tài khoản đăng nhập mới cho nhân viên trực sân (gán role `staff`).
    - Phân bổ và cập nhật ca trực ban cho nhân viên (hỗ trợ phân ca linh hoạt: Ca sáng, Ca chiều, Ca tối, Ca đêm, hoặc Vắng mặt/Nghỉ).
    - Xóa tài khoản nhân viên khi nghỉ việc.
  - **Quản lý danh mục dịch vụ & giá bán:**
    - Tạo mới mặt hàng dịch vụ (tên dịch vụ, đơn vị tính: chai, lon, bộ, lượt, và đơn giá bán).
    - Xóa dịch vụ không còn kinh doanh.
  - **Quản lý đánh giá của khách hàng:**
    - Xem danh sách toàn bộ đánh giá của khách hàng gửi về từng sân bóng (số sao, nội dung nhận xét, người gửi, ngày gửi).
    - Xóa các bình luận hoặc đánh giá vi phạm, ác ý.

---

### 3.2 Role: Staff (Nhân viên trực sân / Lễ tân)
- **Giao diện sử dụng:** Web Staff Dashboard (`frontend/src/pages/StaffDashboard.jsx`).
- **Các chức năng thực tế được phép thực hiện:**
  - **Theo dõi sơ đồ sân trực quan (Timeline / Calendar View):**
    - Chọn ngày bất kỳ để xem ma trận lịch đặt của toàn bộ các sân theo từng block 30 phút (từ 05:00 sáng đến 23:00 đêm).
    - Màu sắc hiển thị trực quan theo trạng thái: Màu xanh lá (Khung giờ trống), Màu vàng cam (Đơn chờ duyệt), Màu xanh ngọc (Đã xác nhận), Màu xanh dương (Đang thi đấu), Màu xám sọc (Sân đang bảo trì).
  - **Tạo đơn đặt sân tại quầy (Desk Booking):**
    - Tiếp nhận yêu cầu đặt sân trực tiếp của khách vãng lai hoặc qua điện thoại.
    - Nhập thông tin khách hàng (Họ tên, Số điện thoại, Ghi chú).
    - Chọn sân bóng, ngày đá, giờ bắt đầu và giờ kết thúc (hệ thống tự động tính tổng tiền theo đúng biểu giá ca và cuối tuần).
    - Chọn thêm các dịch vụ ban đầu (nước uống, áo pitch) và ghi nhận hình thức thanh toán/cọc (Tiền mặt hoặc Chuyển khoản).
  - **Điều phối và xử lý đơn đặt sân:**
    - Xem danh sách các đơn đặt sân trong ngày hoặc toàn bộ lịch sử đơn đặt kèm bộ lọc theo trạng thái và thanh tìm kiếm (theo tên khách hoặc SĐT).
    - Duyệt đơn đặt trực tuyến từ khách hàng: Chuyển trạng thái từ `Chờ duyệt` sang `Đã duyệt`.
    - Hủy đơn đặt sân khi khách báo bận hoặc không đến nhận sân.
  - **Quy trình Check-in đón khách vào sân:**
    - Thực hiện xác nhận khách nhận sân bằng nút Check-in trực tiếp trên danh sách đơn.
    - Hỗ trợ nhập chuỗi mã QR Check-in (`BOOKING_<ID>`) hoặc mã vé rút gọn (`#ID`) để tìm kiếm và thực hiện check-in nhanh tại quầy.
  - **Ghi nhận dịch vụ phát sinh trong trận:**
    - Mở modal thao tác trên từng đơn đang thi đấu để xuất thêm nước giải khát, bóng mượn thêm hoặc áo bib.
    - Tự động cộng dồn chi phí dịch vụ phát sinh vào tổng tiền của đơn đặt sân.
  - **Cập nhật thanh toán quyết toán:**
    - Cập nhật linh hoạt tình trạng thanh toán của đơn đặt: Chưa thanh toán $\rightarrow$ Đã đặt cọc $\rightarrow$ Đã thanh toán 100%.
  - **Xem thư viện ảnh sân & phản hồi khách hàng:**
    - Hỗ trợ nhân viên tải thêm ảnh thực tế của sân bóng lên hệ thống và theo dõi các nhận xét mới nhất của khách hàng.

---

### 3.3 Role: End-User (Khách hàng / Người dùng cuối)
- **Giao diện sử dụng:** Mobile App Flutter (`mobile_app/`) và Web Client (`frontend/src/pages/`).
- **Các chức năng thực tế được phép thực hiện:**
  - **Chế độ Khách vãng lai (Guest Mode):**
    - Người dùng có thể tải app và vào thẳng trang chủ xem danh sách sân bóng mà không bị ép buộc đăng nhập trước.
    - Lọc danh sách sân theo loại sân 5 người, sân 7 người hoặc hiển thị toàn bộ hệ thống sân.
    - Xem thông tin chi tiết từng sân: Album ảnh thực tế dạng gallery vuốt lướt, điểm đánh giá sao trung bình, mô tả cơ sở vật chất, hệ thống chiếu sáng và các nhận xét từ người đá trước.
  - **Đăng ký & Đăng nhập tài khoản:**
    - Đăng ký tài khoản nhanh chóng bằng Số điện thoại, Mật khẩu và Họ tên.
    - Đăng nhập bảo mật qua JWT; ứng dụng tự động lưu phiên đăng nhập cục bộ trên thiết bị qua `SharedPreferences`.
    - Điều hướng thông minh: Khi khách vãng lai bấm "Đặt Sân Ngay", hệ thống yêu cầu đăng nhập; sau khi đăng nhập thành công sẽ tự động mở tiếp màn hình đặt của chính sân vừa chọn mà không bắt khách tìm kiếm lại.
  - **Chọn giờ & Đặt sân trực tuyến:**
    - Chọn ngày thi đấu (từ ngày hiện tại trở đi).
    - Tra cứu ma trận khung giờ còn trống trong ngày tương ứng với sân đã chọn.
    - Chọn giờ bắt đầu và thời lượng trận đấu linh hoạt (60 phút, 90 phút hoặc 120 phút).
    - Hệ thống tự động tính toán tổng tiền trực quan theo giá gốc, hệ số ca ngày thường và hệ số giờ vàng cuối tuần.
    - Nhập ghi chú đặc biệt cho chủ sân (nếu có) và xác nhận gửi đơn đặt sân.
  - **Nhận Vé điện tử & Mã QR Code Check-in:**
    - Ngay sau khi đặt sân thành công, đơn hàng được cấp Mã vé rút gọn định dạng `#ID` (ví dụ: `#12`).
    - Tự động tạo mã QR Code điện tử chứa dữ liệu `BOOKING_<ID>` hiển thị rõ nét trên màn hình vé để xuất trình làm thủ tục nhận sân tại quầy lễ tân.
  - **Quản lý Vé & Lịch sử đặt sân:**
    - Xem toàn bộ danh sách vé điện tử tại Tab "Vé của tôi".
    - Bộ lọc vé theo 5 trạng thái trực quan: Tất cả, Chờ duyệt (`pending`), Đã duyệt (`confirmed`), Đang đá (`checked_in`), Hoàn tất (`completed`), Đã hủy (`cancelled`).
    - Hiển thị chi tiết ngày đá, khung giờ thi đấu, tổng tiền vé và trạng thái thanh toán.
  - **Màn hình Chi tiết Vé Điện Tử & Dịch vụ phát sinh (TicketDetailScreen):**
    - Chạm vào thẻ vé hoặc nút "Xem Chi Tiết Vé & Dịch Vụ >" để mở màn hình vé phong cách Boarding Pass thể thao chuyên nghiệp.
    - Mã QR Code phóng to rõ ràng kèm mã chuỗi `BOOKING_<ID>` phục vụ quét mã check-in trực tiếp tại quầy tiếp tân.
    - Hiển thị đầy đủ thông tin: Sân bóng, phân loại sân (Sân 5 / Sân 7), Khung giờ thi đấu, Ngày đá, Thông tin người đặt và ghi chú.
    - Liệt kê chi tiết danh sách đồ uống/tiện ích phát sinh trong trận (do nhân viên lễ tân thêm vào đơn) kèm đơn giá, số lượng và tổng tiền dịch vụ.
    - Tổng tiền quyết toán tự động cập nhật minh bạch kèm tình trạng thanh toán (`Chưa thanh toán`, `Đã cọc`, `Đã thanh toán`).
    - Tích hợp nút thao tác Hủy vé (khi đơn chờ duyệt / đã duyệt) hoặc Đánh giá sân 1-5 sao (khi trận đấu hoàn tất).
  - **Hủy vé đặt sân chủ động:**
    - Khách hàng có quyền chủ động bấm "Hủy vé" trực tiếp trên app đối với các đơn đang ở trạng thái `Chờ duyệt` hoặc `Đã duyệt` khi có việc đột xuất.
  - **Đánh giá chất lượng sau trận đấu:**
    - Đối với các đơn đặt đã hoàn thành trận đấu (`Hoàn tất`), khách hàng có thể bấm nút "Đánh giá" để chấm điểm sao (từ 1 đến 5 sao) và để lại bình luận nhận xét về chất lượng mặt cỏ, dàn đèn chiếu sáng hoặc thái độ phục vụ.
  - **Quản lý thông tin tài khoản cơ bản:**
    - Xem thông tin hồ sơ (Họ tên, Số điện thoại, Vai trò thành viên).
    - Đăng xuất tài khoản an toàn khỏi thiết bị.
