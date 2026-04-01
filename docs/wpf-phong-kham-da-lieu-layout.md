# Đặc tả WPF Layout -- Trang Chủ, Đặt Lịch, Trang Điều Khiển Bác Sĩ và Dược Sĩ

> Tài liệu này cập nhật lại phần layout WPF theo phong cách các ảnh tham chiếu kiểu YouMed, nhưng vẫn giữ nguyên logic nghiệp vụ cốt lõi đã mô tả trong `docs/cai-tien-phong-kham-da-lieu.md`.

---

## 1. Mục tiêu cập nhật

### Mục tiêu giao diện

- Làm lại **Trang chủ public** theo bố cục hiện đại:
  - Header trắng, menu ngang, nút `Đăng nhập`
  - Hero xanh lớn, có thanh tìm kiếm nổi bật
  - Section giới thiệu đặt khám trực tuyến
  - Section đội ngũ chuyên gia
  - Section nội dung y tế / kiến thức sức khỏe
  - Footer nhiều cột giống web sản phẩm
- Làm lại **Trang đăng nhập / đăng ký** theo bố cục:
  - Header đồng bộ với trang chủ
  - Khu trái là visual quảng bá / QR app / điểm tin cậy
  - Khu phải là thẻ form có tab `Đăng nhập` và `Đăng ký`
- Bổ sung **màn hình chọn bác sĩ và đặt lịch** sau khi người dùng chọn bác sĩ:
  - cột trái hiển thị thông tin bác sĩ
  - cột phải là form đặt khám
  - combobox giờ khám có trạng thái màu:
    - xanh: còn trống
    - đỏ: đã đặt
    - vàng: bác sĩ bận / khóa lịch
- Bổ sung **trang điều khiển riêng cho bác sĩ**:
  - không quay lại trang chủ sau khi đăng nhập
  - dạng quản trị/sidebar như ảnh tham chiếu số 2
- Bổ sung **trang điều khiển riêng cho dược sĩ**:
  - quản lý đơn thuốc, kho thuốc, nhà cung cấp, thanh toán và in hóa đơn

### Mục tiêu nghiệp vụ

- **Không đổi API và logic xác thực**
- **Áp dụng đúng mô hình role mới, không còn vai trò lễ tân**
- **Luồng đặt lịch đổi theo hướng bệnh nhân chọn bác sĩ và bác sĩ duyệt**
- **Không đổi ý nghĩa cốt lõi của trạng thái lịch hẹn**
- Giao diện mới chỉ là lớp trình bày cho đúng trải nghiệm người dùng

---

## 2. Các ràng buộc nghiệp vụ bắt buộc phải giữ nguyên

Phần layout mới phải bám các quy tắc trong `cai-tien-phong-kham-da-lieu.md`, cụ thể:

### Xác thực

- `Đăng ký` chỉ dành cho **bệnh nhân**
- `Đăng nhập` vẫn đi qua `POST /api/v1/auth/login`
- Backend vẫn kiểm tra:
  - tài khoản tồn tại
  - mật khẩu đúng
  - `is_active = 1`
  - `email_verified_at IS NOT NULL`
- Đăng nhập thành công:
  - cấp `access_token` 30 phút
  - cấp `refresh_token` 7 ngày
  - cập nhật `last_login`
  - redirect theo role
  - khi `Đăng xuất` thì luôn quay lại `Trang đăng nhập`

### Đăng ký

Form đăng ký phải giữ đúng dữ liệu và validate gốc:

- `full_name`: bắt buộc, 2-100 ký tự
- `email`: bắt buộc, đúng định dạng, duy nhất
- `password`: bắt buộc, tối thiểu 8 ký tự, có chữ hoa và số
- `phone`: không bắt buộc, 10-11 số VN

### Đặt lịch

Từ trang chủ, mọi entry point `Đặt khám` vẫn phải đi vào luồng:

1. Chọn dịch vụ chính
2. Chọn bác sĩ bệnh nhân mong muốn
3. Xem bác sĩ nào đang rảnh bằng `GET /api/v1/appointments/available-slots`
4. Chọn ngày giờ
5. Nhập lý do khám
6. Tạo lịch qua `POST /api/v1/appointments`
7. Lịch mới có `status = pending` để chờ bác sĩ duyệt

### Trạng thái lịch không được đổi tên

- `pending`
- `confirmed`
- `checked_in`
- `in_progress`
- `completed`
- `cancelled`
- `no_show`

### Diễn giải trạng thái theo mô hình mới

- `pending`: bệnh nhân đã gửi yêu cầu, chờ bác sĩ duyệt hoặc đề nghị giờ khác
- `confirmed`: bác sĩ đã chốt lịch
- `checked_in`: bệnh nhân đã đến khám

### Nghiệp vụ nội bộ

- Không đưa các thao tác nội bộ như `start`, `complete`, phát thuốc, thanh toán, in hóa đơn lên trang public
- Các phần đó vẫn thuộc trang nội bộ, không thuộc đặc tả giao diện public này

---

## 3. Định hướng thiết kế tổng thể

### Tinh thần thị giác

- Giống ảnh tham chiếu ở bố cục và cảm giác:
  - sạch
  - sáng
  - nhiều khoảng trắng
  - CTA rõ
  - phần hero xanh nổi bật
  - card bo góc lớn
- Không bê nguyên nội dung thương hiệu YouMed
- Thay thế bằng nội dung phù hợp với **Phòng khám Da liễu**

### Ngôn ngữ giao diện

- Tiếng Việt
- Giọng điệu y tế chuyên nghiệp, dễ hiểu
- Tránh câu quá marketing, ưu tiên rõ chức năng

### Phân nhóm màn hình public

- `Trang chủ`
- `Trang đăng nhập`
- `Tab đăng ký` trong `Trang đăng nhập`
- `Điểm vào đặt lịch` từ menu, ô tìm kiếm, thẻ bác sĩ, thẻ dịch vụ

### Phân nhóm theo vai trò sau đăng nhập

- `bệnh nhân`:
  - vẫn ở trang chủ
  - nhìn thấy thêm khu `Đặt lịch khám`, `Lịch hẹn của tôi`
- `bác sĩ`:
  - vào thẳng trang điều khiển bác sĩ
  - không hiển thị trang chủ
- `dược sĩ`:
  - vào thẳng trang điều khiển dược sĩ
  - không hiển thị trang chủ
- `quản trị`:
  - vào trang điều khiển quản trị

---

## 4. Kiến trúc layout cấp cao

```text
┌───────────────────────────────────────────────────────────────────────┐
│ Khach/Benh nhan: Header | Trang chu | Dat lich | Footer            │
│ Bac si: Sidebar | Header noi bo | Trang dieu khien bac si          │
│ Duoc si: Sidebar | Header noi bo | Trang dieu khien duoc si        │
├───────────────────────────────────────────────────────────────────────┤
│ Cong khai: Trang chu, Trang dang nhap, Trang dat lich               │
│ Noi bo: Trang bac si, Trang duoc si, Trang quan tri                 │
├───────────────────────────────────────────────────────────────────────┤
│ Footer đa cột                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### Container chính WPF

```xml
<DockPanel Background="#F7F9FC">
  <local:PublicHeader DockPanel.Dock="Top" />
  <local:PublicFooter DockPanel.Dock="Bottom" />
  <ScrollViewer VerticalScrollBarVisibility="Auto">
    <ContentControl Content="{Binding CurrentPublicPage}" />
  </ScrollViewer>
</DockPanel>
```

---

## 5. Trang chủ -- bố cục mới

## 5.0 Quy tắc hiển thị trang chủ theo trạng thái đăng nhập

- Chưa đăng nhập:
  - tất cả người dùng đều nhìn thấy trang chủ giới thiệu phòng khám
- Đã đăng nhập với vai trò `bệnh nhân`:
  - vẫn hiển thị trang chủ
  - thêm các khối cá nhân hóa như:
    - `Đặt lịch khám`
    - `Lịch hẹn của tôi`
    - bác sĩ đã xem gần đây
- Đã đăng nhập với vai trò `bác sĩ`:
  - không vào trang chủ
  - chuyển thẳng sang trang điều khiển bác sĩ
- Đã đăng nhập với vai trò `dược sĩ`:
  - không vào trang chủ
  - chuyển thẳng sang trang điều khiển dược sĩ
- Đã đăng nhập với vai trò `quản trị`:
  - không vào trang chủ
  - chuyển sang trang điều khiển quản trị

## 5.1 Header public

### Bố cục

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Logo PK Da Liễu | Đặt khám | Tư vấn trực tuyến | Tin y tế | Bác sĩ | Đăng nhập │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Thành phần

- Bên trái:
  - Logo
  - Tên hệ thống: `Phòng Khám Da Liễu`
- Ở giữa:
  - `Đặt khám`
  - `Tư vấn trực tuyến`
  - `Tin y tế`
  - `Đội ngũ bác sĩ`
  - `Dành cho bác sĩ` hoặc `Liên hệ`
- Bên phải:
  - nút viền xanh `Đăng nhập`

### Hành vi

- Click logo:
  - về `Trang chủ`
- Click `Đăng nhập`:
  - mở `Trang đăng nhập`
- Click `Đặt khám`:
  - mở menu/dropdown:
    - `Đặt theo bác sĩ`
    - `Đặt theo dịch vụ`
    - `Đặt khám nhanh`
- Click `Tin y tế`:
  - cuộn đến section kiến thức hoặc mở trang danh sách bài viết

### WPF gợi ý

```xml
<Grid Height="72" Background="White">
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="Auto" />
    <ColumnDefinition Width="*" />
    <ColumnDefinition Width="Auto" />
  </Grid.ColumnDefinitions>

  <StackPanel Orientation="Horizontal" VerticalAlignment="Center">
    <Image Width="44" Height="44" />
    <TextBlock Text="Phòng Khám Da Liễu" />
  </StackPanel>

  <StackPanel Grid.Column="1"
              Orientation="Horizontal"
              HorizontalAlignment="Center"
              VerticalAlignment="Center">
    <Button Content="Đặt khám" />
    <Button Content="Tư vấn trực tuyến" />
    <Button Content="Tin y tế" />
    <Button Content="Đội ngũ bác sĩ" />
    <Button Content="Dành cho bác sĩ" />
  </StackPanel>

  <Button Grid.Column="2"
          Content="Đăng nhập"
          Width="140"
          Height="44" />
</Grid>
```

---

## 5.2 Hero section

### Mục tiêu

Bám cấu trúc ảnh tham chiếu:

- nền xanh lớn
- headline lớn ở giữa/trái
- mô tả ngắn
- thanh tìm kiếm nổi bật dạng pill
- hình minh họa / ảnh bác sĩ hoặc bệnh nhân ở bên phải

### Nội dung đề xuất

**Tiêu đề lớn:**

`Đặt khám da liễu nhanh chóng`

**Mô tả phụ:**

`Tìm bác sĩ, chọn dịch vụ, xem lịch trống và đặt khám trước ngay trên hệ thống.`

**Placeholder search:**

`Triệu chứng, bác sĩ, dịch vụ da liễu...`

### Luồng từ search

Thanh search ở hero chỉ là điểm vào nhanh, nhưng không được bỏ qua nghiệp vụ:

- Gõ `mụn`, `nám`, `dị ứng da`:
  - gợi ý dịch vụ / chuyên khoa / bài viết
- Gõ tên bác sĩ:
  - gợi ý hồ sơ bác sĩ
- Chọn một gợi ý đặt khám:
  - chuyển đến luồng chọn bác sĩ, xem slot rảnh và gửi yêu cầu đặt lịch
- Chọn một bài viết:
  - mở trang kiến thức, không tạo lịch

### WPF layout gợi ý

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ nền xanh                                                                  │
│                                                                            │
│             Đặt khám da liễu nhanh chóng                                  │
│      Tìm bác sĩ, chọn dịch vụ, xem lịch trống và đặt khám trước          │
│                                                                            │
│      [ Triệu chứng, bác sĩ, dịch vụ da liễu...                    🔍 ]    │
│                                                                            │
│                                          [ảnh minh họa / bác sĩ / bệnh nhân]│
└────────────────────────────────────────────────────────────────────────────┘
```

### Màu sắc đề xuất

- nền hero: `#2474D8`
- gradient phụ: `#2C89F3`
- text trắng
- search bar trắng
- icon search xám xanh

### Control WPF

```xml
<Border CornerRadius="0,0,32,32" Background="#2474D8" MinHeight="520">
  <Grid Margin="64,40">
    <Grid.ColumnDefinitions>
      <ColumnDefinition Width="3*" />
      <ColumnDefinition Width="2*" />
    </Grid.ColumnDefinitions>

    <StackPanel VerticalAlignment="Center">
      <TextBlock Text="Đặt khám da liễu nhanh chóng"
                 FontSize="40"
                 FontWeight="Bold"
                 Foreground="White" />
      <TextBlock Text="Tìm bác sĩ, chọn dịch vụ, xem lịch trống và đặt khám trước ngay trên hệ thống."
                 Margin="0,16,0,24"
                 FontSize="18"
                 TextWrapping="Wrap"
                 Foreground="White" />

      <Border Background="White" CornerRadius="28" Height="60">
        <Grid>
          <TextBox Margin="24,0,56,0"
                   BorderThickness="0"
                   Background="Transparent"
                   VerticalContentAlignment="Center"
                   Text="{Binding SearchKeyword}" />
          <Button HorizontalAlignment="Right"
                  Width="48"
                  Background="Transparent"
                  BorderThickness="0" />
        </Grid>
      </Border>
    </StackPanel>

    <Image Grid.Column="1"
           Stretch="Uniform"
           HorizontalAlignment="Right" />
  </Grid>
</Border>
```

---

## 5.3 Section "Đặt lịch khám trực tuyến"

Ngay dưới hero cần có một section đơn giản để nhấn mạnh nghiệp vụ chính.

### Nội dung

- Tiêu đề: `Đặt lịch khám trực tuyến`
- Subtitle: `Chọn bác sĩ bạn muốn, xem giờ rảnh và gửi yêu cầu trực tiếp`
- 3 hoặc 4 thẻ tác vụ:
  - `Tìm bác sĩ`
  - `Chọn dịch vụ`
  - `Xem lịch trống`
  - `Bác sĩ duyệt`

### Ý nghĩa nghiệp vụ

Section này phải phản ánh đúng Module 2:

- chỉ khi chọn slot hợp lệ mới được tạo lịch
- lịch vừa tạo luôn ở trạng thái `pending`
- bác sĩ là người duyệt/chốt lịch hoặc đề nghị đổi giờ
- nếu bác sĩ hoãn lịch thì phải có ghi chú cho bệnh nhân, có thể kèm ưu đãi giảm giá

### Gợi ý UI

```text
Đặt lịch khám trực tuyến
Tìm đúng bác sĩ, xem giờ rảnh, gửi yêu cầu dễ dàng

[ Bác sĩ ] [ Dịch vụ ] [ Lịch trống ] [ Bác sĩ duyệt ]
```

---

## 5.4 Section dịch vụ nổi bật

Để phù hợp phòng khám da liễu, trang chủ nên có cụm card dịch vụ thay cho nội dung quá chung.

### Card đề xuất

- Điều trị mụn
- Điều trị nám
- Viêm da dị ứng
- Soi da và tư vấn
- Laser da liễu
- Tái khám

### Hành vi

- Click card:
  - mở chi tiết dịch vụ
  - hoặc đẩy thẳng vào flow đặt lịch với `primary_service_id` đã chọn sẵn

### Ràng buộc

- Chỉ preselect dịch vụ
- Không tự tạo lịch nếu chưa chọn bác sĩ + slot + lý do khám

---

## 5.5 Section đội ngũ chuyên gia

Section này nên bám ảnh tham chiếu số 4 và 5:

- bên trái là danh sách bác sĩ nổi bật
- bên phải là đoạn giới thiệu + nút CTA

### Nội dung

Mỗi card bác sĩ gồm:

- ảnh đại diện tròn
- họ tên
- chức danh
- chuyên khoa
- kinh nghiệm ngắn

### Hành vi

- Click card bác sĩ:
  - mở profile bác sĩ public
  - từ profile có nút `Đặt lịch với bác sĩ này`
  - sau khi chọn bác sĩ sẽ mở màn hình đặt lịch chi tiết giống ảnh tham chiếu số 1

### Nguồn dữ liệu

- Dùng dữ liệu public từ danh sách bác sĩ
- Chỉ hiển thị bác sĩ `is_available = 1`

---

## 5.5A Màn hình đặt lịch sau khi chọn bác sĩ

Màn hình này phải bám ảnh tham chiếu số 1.

### Bố cục 2 cột

- Cột trái:
  - ảnh bác sĩ
  - họ tên
  - chuyên khoa
  - số điện thoại
  - email
  - mô tả ngắn
- Cột phải:
  - form `Đặt khám`
  - họ tên bệnh nhân
  - ngày khám
  - giờ khám
  - ghi chú
  - nút `Đặt lịch`

### Luồng hiển thị

1. Từ `Trang chủ`, bệnh nhân hoặc khách chọn 1 bác sĩ
2. Mở `Trang đặt lịch theo bác sĩ`
3. Hiển thị thông tin bác sĩ ở bên trái
4. Bên phải gọi `available-slots` theo ngày được chọn
5. Danh sách giờ khám hiển thị rõ từng trạng thái

### Màu trạng thái slot

- `Xanh lá`: còn trống, có thể chọn
- `Đỏ`: đã được đặt bởi lịch khác, không thể chọn
- `Vàng`: bác sĩ bận / khóa lịch / có việc nội bộ, không thể chọn

### Legend hiển thị dưới form

```text
🟢 Còn trống   🔴 Đã đặt   🟡 Bác sĩ bận
```

### Gợi ý hiển thị trong combobox giờ

```text
🟢 08:00 - 08:30 (Còn trống)
🔴 08:30 - 09:00 (Đã đặt)
🟡 09:00 - 09:30 (Bác sĩ bận)
```

### Quy tắc chọn giờ

- Chỉ slot xanh được phép chọn
- Slot đỏ và vàng chỉ hiển thị để người dùng hiểu lịch, không được submit
- Có dòng nhắc:
  - `Chỉ hiển thị các khung giờ chưa qua thời gian hiện tại`

### Nếu chưa đăng nhập

- Vẫn được xem màn hình bác sĩ và lịch
- Khi bấm `Đặt lịch`:
  - chuyển sang `Trang đăng nhập`
  - sau đăng nhập quay lại đúng `Trang đặt lịch theo bác sĩ`

### WPF gợi ý

```xml
<Grid Margin="32">
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="1*" />
    <ColumnDefinition Width="1.4*" />
  </Grid.ColumnDefinitions>

  <Border Margin="0,0,24,0" Background="White" CornerRadius="20" Padding="24">
    <StackPanel>
      <TextBlock Text="{Binding SelectedDoctor.FullName}" FontSize="28" FontWeight="Bold" />
      <TextBlock Text="{Binding SelectedDoctor.Specialty}" />
      <TextBlock Text="{Binding SelectedDoctor.Phone}" />
      <TextBlock Text="{Binding SelectedDoctor.Email}" />
    </StackPanel>
  </Border>

  <Border Grid.Column="1" Background="White" CornerRadius="20" Padding="24">
    <StackPanel>
      <TextBlock Text="Đặt khám" FontSize="28" FontWeight="Bold" />
      <TextBox Text="{Binding BookingPatientName}" />
      <DatePicker SelectedDate="{Binding BookingDate}" />
      <ComboBox ItemsSource="{Binding DoctorSlotOptions}"
                SelectedItem="{Binding SelectedSlot}" />
      <TextBox Text="{Binding BookingNote}" AcceptsReturn="True" Height="120" />
      <Button Content="Đặt lịch" Command="{Binding SubmitBookingCommand}" />
      <StackPanel Orientation="Horizontal">
        <TextBlock Text="🟢 Còn trống" />
        <TextBlock Margin="16,0,0,0" Text="🔴 Đã đặt" />
        <TextBlock Margin="16,0,0,0" Text="🟡 Bác sĩ bận" />
      </StackPanel>
    </StackPanel>
  </Border>
</Grid>
```

### WPF gợi ý

```xml
<Grid Margin="0,40,0,0">
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="2*" />
    <ColumnDefinition Width="*" />
  </Grid.ColumnDefinitions>

  <ItemsControl ItemsSource="{Binding FeaturedDoctors}">
    <ItemsControl.ItemsPanel>
      <ItemsPanelTemplate>
        <UniformGrid Columns="2" />
      </ItemsPanelTemplate>
    </ItemsControl.ItemsPanel>
  </ItemsControl>

  <StackPanel Grid.Column="1" Margin="32,0,0,0">
    <TextBlock Text="Đội ngũ chuyên gia da liễu" />
    <TextBlock Text="Nội dung tư vấn và thông tin bác sĩ được cập nhật từ đội ngũ chuyên môn của phòng khám." />
    <Button Content="Xem toàn bộ bác sĩ" />
  </StackPanel>
</Grid>
```

---

## 5.6 Section kiến thức y tế

Bám tinh thần ảnh tham chiếu:

- có tab phân loại
- có thanh tìm kiếm ngang
- bài viết hiển thị dạng card ngang hoặc carousel

### Danh mục phù hợp với phòng khám da liễu

- `Bệnh da liễu`
- `Thuốc`
- `Chăm sóc da`
- `Thủ thuật`

### Thành phần card bài viết

- thumbnail
- tiêu đề
- bác sĩ / dược sĩ biên soạn
- ngày cập nhật

### Lưu ý nghiệp vụ

- Đây là khu kiến thức tham khảo
- Không thay thế tư vấn trực tiếp
- Footer phải nhắc rõ tính chất tham khảo

### Control WPF

- `TabControl` hoặc `ListBox` làm tab category
- `ItemsControl` + `ScrollViewer` ngang cho carousel bài viết

---

## 5.7 Banner tin cậy / chuẩn nội dung

Có thể thêm 1 dải xanh phía dưới section bác sĩ giống ảnh tham chiếu:

- biên soạn bởi bác sĩ / dược sĩ
- chính sách nội dung minh bạch
- chính sách quảng cáo
- chính sách bảo mật

Mục đích:

- tăng độ tin cậy
- làm cầu nối trực quan trước footer

---

## 5.8 Footer

Footer nên gần ảnh tham chiếu số 3:

- cột thông tin công ty / phòng khám
- cột giới thiệu
- cột dịch vụ
- cột hỗ trợ
- mạng xã hội
- dòng disclaimer ở cuối

### Nội dung tối thiểu

- Tên đơn vị
- Địa chỉ
- Hotline
- Email CSKH
- Liên kết:
  - Giới thiệu
  - Đội ngũ bác sĩ
  - Dịch vụ
  - Chính sách bảo mật
  - Điều khoản sử dụng

### Disclaimer

Phải có dòng tương tự:

`Các thông tin trên hệ thống chỉ nhằm mục đích tham khảo, không thay thế cho chẩn đoán và điều trị y khoa.`

### WPF layout

```xml
<Grid Background="White" Margin="0,48,0,0" Padding="48,32">
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="2*" />
    <ColumnDefinition Width="*" />
    <ColumnDefinition Width="*" />
    <ColumnDefinition Width="*" />
  </Grid.ColumnDefinitions>
</Grid>
```

---

## 6. Trang đăng nhập / đăng ký -- bố cục mới

## 6.1 Bố cục tổng thể

Trang đăng nhập phải dùng lại header public như trang chủ.

Phần thân trang chia 2 cột:

- trái: khu visual / QR / lợi ích hệ thống
- phải: thẻ xác thực

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ Header                                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│   Visual trái                              |   Card Đăng nhập/Đăng ký   │
│   QR / icon / mô tả                        |   tab + form               │
├──────────────────────────────────────────────────────────────────────────┤
│ Footer                                                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6.2 Khu visual bên trái

### Mục tiêu

Giữ cảm giác giống ảnh:

- nền sáng
- vòng tròn mềm
- QR hoặc minh họa tải app
- icon nổi xung quanh
- copy ngắn nói về tiện ích đặt khám

### Nội dung đề xuất

`Đặt khám da liễu dễ dàng hơn với hệ thống trực tuyến của phòng khám`

`Xem lịch trống, nhận nhắc hẹn, theo dõi lịch sử khám và hóa đơn`

### Ghi chú

- Nếu dự án WPF không có app mobile thật, khối QR có thể đổi thành:
  - mã QR mở website
  - hoặc card minh họa tính năng
- Không nên để QR vô nghĩa

---

## 6.3 Card xác thực bên phải

### Cấu trúc

- Card nền trắng
- bo góc 20-24
- bóng đổ nhẹ
- trên cùng là tab:
  - `Đăng nhập`
  - `Đăng ký`

### Quy tắc tab

- Không mở cửa sổ khác cho đăng ký
- Dùng cùng 1 card, đổi nội dung bằng tab
- Chuyển tab không làm mất style tổng thể

### Control WPF gợi ý

```xml
<Border Background="White" CornerRadius="24" Padding="32" Width="480">
  <TabControl SelectedIndex="{Binding SelectedAuthTabIndex}">
    <TabItem Header="Đăng nhập" />
    <TabItem Header="Đăng ký" />
  </TabControl>
</Border>
```

---

## 6.4 Tab đăng nhập

### Lưu ý rất quan trọng về nghiệp vụ

Ảnh tham chiếu dùng `Số điện thoại`, nhưng tài liệu nghiệp vụ gốc đang mô tả đăng nhập bằng:

- `email`
- `password`

Vì vậy spec mới phải ưu tiên **đúng nghiệp vụ** hơn là sao chép y nguyên field của ảnh.

### Khuyến nghị UI

Để vừa gần ảnh vừa đúng logic:

- label ô đầu tiên: `Email`
- placeholder: `Nhập email đăng nhập`
- ô thứ hai: `Mật khẩu`
- có icon ẩn/hiện mật khẩu
- có checkbox `Ghi nhớ đăng nhập`
- có link `Quên mật khẩu?`
- nút submit chiếm full width

### Thành phần form

- `Email`
- `Mật khẩu`
- `Ghi nhớ đăng nhập`
- `Quên mật khẩu?`
- `Đăng nhập`
- dòng chuyển sang đăng ký

### Hành vi

1. Nhập email + mật khẩu
2. Validate client
3. Gọi `POST /api/v1/auth/login`
4. Nếu sai:
   - hiển thị lỗi ngay trong card
5. Nếu đúng:
   - redirect theo role

### Redirect theo role

- `bệnh nhân` -> quay về trang chủ đã đăng nhập
- `bác sĩ` -> trang điều khiển bác sĩ
- `dược sĩ` -> trang điều khiển dược sĩ
- `quản trị` -> trang điều khiển quản trị

### Đăng xuất

- Người dùng bấm `Đăng xuất` từ menu tài khoản
- Hệ thống xóa access token / refresh token phiên hiện tại
- Điều hướng về `Trang đăng nhập`

### WPF layout gợi ý

```xml
<StackPanel>
  <TextBlock Text="Email" />
  <TextBox Text="{Binding LoginEmail, UpdateSourceTrigger=PropertyChanged}" />

  <TextBlock Margin="0,16,0,0" Text="Mật khẩu" />
  <Grid>
    <PasswordBox />
    <Button HorizontalAlignment="Right" />
  </Grid>

  <Grid Margin="0,16,0,0">
    <Grid.ColumnDefinitions>
      <ColumnDefinition Width="*" />
      <ColumnDefinition Width="Auto" />
    </Grid.ColumnDefinitions>
    <CheckBox Content="Ghi nhớ đăng nhập" />
    <Button Grid.Column="1" Content="Quên mật khẩu?" />
  </Grid>

  <Button Margin="0,24,0,0"
          Height="48"
          Content="Đăng nhập"
          Command="{Binding LoginCommand}" />
</StackPanel>
```

---

## 6.5 Tab đăng ký

### Mục tiêu

Giữ bố cục giống card đăng nhập, nhưng thêm trường đúng nghiệp vụ đăng ký bệnh nhân.

### Thành phần

- `Họ và tên`
- `Email`
- `Số điện thoại`
- `Mật khẩu`
- `Xác nhận mật khẩu`
- checkbox đồng ý điều khoản
- nút `Đăng ký`

### Luồng nghiệp vụ

1. Nhập đủ thông tin
2. Validate local
3. Gọi `POST /api/v1/auth/register`
4. Tạo tài khoản vai trò bệnh nhân và hồ sơ bệnh nhân
5. Hiển thị thông báo:
   - `Kiểm tra email để xác thực tài khoản`

### Không được làm

- Không cho tự chọn role khi đăng ký
- Không cho tự tạo tài khoản bác sĩ / quản trị / dược sĩ

---

## 6.6 Quên mật khẩu

Ảnh tham chiếu có link `Quên mật khẩu?`, nên spec mới cần mô tả rõ.

### Luồng

1. Click `Quên mật khẩu?`
2. Mở dialog nhỏ hoặc panel phụ
3. Nhập email
4. Gọi `POST /api/v1/auth/forgot-password`
5. Hệ thống gửi email reset
6. Người dùng đặt lại mật khẩu qua `POST /api/v1/auth/reset-password`

### Gợi ý UI

- Không điều hướng sang màn hình phức tạp nếu chưa cần
- Ưu tiên dialog đơn giản để giữ flow gọn

---

## 7. Điều hướng giữa Trang chủ và Đăng nhập

## 7.1 Các entry point tới đăng nhập

- Nút `Đăng nhập` trên header
- CTA khi người dùng bấm `Đặt khám` nhưng chưa xác thực
- CTA khi muốn xem `Lịch hẹn của tôi`
- CTA khi muốn lưu bác sĩ yêu thích

## 7.1A Màn hình `Lịch hẹn của tôi`

Vì mô hình mới bỏ lễ tân khỏi luồng đặt lịch, khu `Lịch hẹn của tôi` của bệnh nhân phải rõ hơn tài liệu cũ.

### Thông tin mỗi lịch hẹn cần hiển thị

- bác sĩ đã chọn
- dịch vụ chính
- ngày giờ bệnh nhân yêu cầu
- trạng thái:
  - `pending`
  - `confirmed`
  - `cancelled`
- ghi chú phản hồi từ bác sĩ nếu có
- đề nghị giờ mới nếu bác sĩ muốn hoãn
- ưu đãi giảm giá nếu bác sĩ gửi kèm

### Hành vi chính

- bệnh nhân xem được lịch nào đang chờ bác sĩ duyệt
- bệnh nhân xem được lịch nào đã được bác sĩ chốt
- nếu bác sĩ đề nghị dời giờ:
  - bệnh nhân đọc ghi chú
  - xem ngày giờ mới
  - xem ưu đãi giảm giá
  - chọn đồng ý hoặc hủy lịch

## 7.2 Quy tắc chặn chưa đăng nhập

Người dùng chưa đăng nhập có thể:

- xem trang chủ
- xem bác sĩ
- xem dịch vụ
- xem bài viết
- xem slot trống nếu hệ thống cho phép public

Người dùng chưa đăng nhập **không được**:

- xác nhận tạo lịch cuối cùng
- xem lịch hẹn cá nhân
- xem hóa đơn
- xem lịch sử khám

### Khuyến nghị

Cho phép xem trước bác sĩ và slot để tăng chuyển đổi, nhưng bước submit cuối cùng phải yêu cầu đăng nhập/đăng ký.

## 7.3 Trang điều khiển bác sĩ sau đăng nhập

Màn hình bác sĩ phải đi theo phong cách quản trị giống ảnh tham chiếu số 2, nhưng nội dung bám nghiệp vụ ở `cai-tien-phong-kham-da-lieu.md`.

### Quy tắc điều hướng

- Bác sĩ đăng nhập thành công:
  - không quay về trang chủ
  - vào thẳng trang điều khiển bác sĩ
- Bác sĩ đăng xuất:
  - quay về trang đăng nhập

### Bố cục

- Sidebar trái
- Header nội bộ ở trên
- Nội dung chính bên phải là data grid + form + tab

### Menu bác sĩ

- Tổng quan
- Lịch cần duyệt
- Lịch hôm nay
- Bệnh nhân
- Khám bệnh
- Kê đơn thuốc
- Thông báo
- Đăng xuất

### Nguyên tắc phân quyền của bác sĩ

- Bác sĩ **được xem** lịch đã được phân cho mình
- Bác sĩ **được duyệt** lịch chờ của mình
- Bác sĩ **được xem** danh sách bệnh nhân và hồ sơ liên quan
- Bác sĩ **không được tự quản lý lịch khám tổng thể**
- Bác sĩ **không được tự tạo tài khoản bác sĩ mới**
- Bác sĩ **không được đặt lại mật khẩu cho tài khoản khác**

### Chức năng chính phải có

- duyệt lịch `pending`
- đề nghị hoãn và gửi ghi chú cho bệnh nhân
- thêm ưu đãi giảm giá nếu cần đổi giờ
- xem lịch làm việc của mình ở chế độ xem
- đánh dấu bệnh nhân đã đến
- nhập kết quả khám
- nhập danh sách thuốc và số lượng
- gửi phiếu thuốc sang dược sĩ

### Bảng dữ liệu bác sĩ nên có thêm cột `Bệnh nhân`

Trong vùng làm việc của bác sĩ, ngoài danh sách thuốc gửi dược sĩ, phải có cụm dữ liệu bệnh nhân rõ ràng:

- mã bệnh nhân
- họ tên bệnh nhân
- số điện thoại
- lịch sử khám gần nhất
- ghi chú dị ứng thuốc
- trạng thái lịch hiện tại

Mục đích:

- giúp bác sĩ tra nhanh bệnh nhân trước khi khám
- giảm việc nhập sai đơn thuốc
- liên kết trực tiếp từ lịch hẹn sang hồ sơ bệnh nhân

### Dạng trình bày

- Bảng lớn, lọc theo ngày, trạng thái, bệnh nhân
- Panel chi tiết bên phải hoặc dưới
- màu trạng thái rõ ràng:
  - `pending`: vàng nhạt
  - `confirmed`: xanh dương nhạt
  - `checked_in`: xanh lá nhạt

## 7.4 Trang điều khiển dược sĩ sau đăng nhập

### Quy tắc điều hướng

- Dược sĩ đăng nhập thành công:
  - không quay về trang chủ
  - vào thẳng trang điều khiển dược sĩ
- Dược sĩ đăng xuất:
  - quay về trang đăng nhập

### Menu dược sĩ

- Tổng quan kho dược
- Phiếu thuốc chờ xử lý
- Chuẩn bị thuốc
- Giao thuốc và thanh toán
- Hóa đơn
- Kho thuốc
- Nhà cung cấp
- Lịch sử nhập xuất
- Đăng xuất

### Chức năng chính

- nhận phiếu thuốc bác sĩ gửi sang
- kiểm tra tồn kho theo lô
- nếu thiếu thuốc thì cảnh báo và đề xuất nhập thêm
- quản lý nhà cung cấp
- tạo hoặc cập nhật phiếu nhập thuốc từ nhà cung cấp
- vừa phát thuốc vừa thu tiền
- in hóa đơn kèm danh sách thuốc cho bệnh nhân

### Ghi chú nghiệp vụ

- Vì mô hình mới bỏ vai trò thu ngân, phần thanh toán thuộc dược sĩ
- Hóa đơn cuối cùng phải bao gồm:
  - phí khám
  - dịch vụ phát sinh
  - tiền thuốc
  - tổng thanh toán
  - danh sách thuốc đã giao

## 7.5 Trang điều khiển quản trị sau đăng nhập

Đây là nơi quản lý trung tâm của hệ thống. Các mục mà bác sĩ không được thao tác thì quản trị sẽ làm ở đây.

### Quy tắc điều hướng

- Quản trị đăng nhập thành công:
  - vào thẳng trang điều khiển quản trị
- Quản trị đăng xuất:
  - quay về trang đăng nhập

### Menu quản trị

- Tổng quan
- Quản lý lịch khám
- Quản lý tài khoản
- Quản lý bác sĩ
- Quản lý bệnh nhân
- Quản lý dược sĩ
- Nhà cung cấp
- Báo cáo
- Đăng xuất

### Phân quyền quản trị bắt buộc phải có

- chỉ quản trị mới được quản lý lịch khám tổng thể
- chỉ quản trị mới được tạo tài khoản bác sĩ
- chỉ quản trị mới được tạo tài khoản dược sĩ
- quản trị có thể tạo tài khoản bệnh nhân nếu cần nhập hộ
- quản trị có thể khóa/mở khóa tài khoản
- quản trị có thể đặt lại mật khẩu cho tài khoản khác

### Màn hình quản lý tài khoản

Phải có các cột:

- mã tài khoản
- họ tên
- email
- số điện thoại
- vai trò
- trạng thái hoạt động
- ngày tạo
- người tạo

### Hành động trong quản lý tài khoản

- thêm tài khoản bệnh nhân
- thêm tài khoản bác sĩ
- thêm tài khoản dược sĩ
- sửa thông tin tài khoản
- khóa tài khoản
- mở khóa tài khoản
- đặt lại mật khẩu

### Màn hình quản lý lịch khám

Quản trị là người cấu hình:

- khung giờ làm việc của bác sĩ
- số bệnh nhân tối đa mỗi khung giờ
- ngày nghỉ của bác sĩ
- ngày nghỉ toàn phòng khám
- các khoảng bận nội bộ để hiển thị slot màu vàng

### Gợi ý hộp thoại `Đặt lại mật khẩu`

Hộp thoại này cần phù hợp nghiệp vụ hơn ảnh minh họa:

- hiển thị họ tên tài khoản
- hiển thị vai trò
- nhập mật khẩu mới
- nhập xác nhận mật khẩu mới
- tùy chọn buộc đổi mật khẩu ở lần đăng nhập kế tiếp
- nút `Lưu mật khẩu mới`

### Gợi ý bảng lịch khám do quản trị quản lý

- bác sĩ
- ngày
- giờ bắt đầu
- giờ kết thúc
- trạng thái:
  - còn trống
  - đã đặt
  - bác sĩ bận
- ghi chú điều chỉnh

---

## 8. Responsive trong WPF khi resize cửa sổ

Vì đây là desktop WPF, không cần responsive kiểu mobile web, nhưng vẫn phải co giãn hợp lý.

### Quy tắc cho trang chủ

- Dưới `1280px`:
  - hero chuyển sang 1 cột
  - ảnh minh họa xuống dưới
  - section bác sĩ từ 2 cột về 1 cột
- Dưới `1100px`:
  - menu header gom bớt vào `More`
- Dưới `900px`:
  - trang đăng nhập chuyển visual lên trên, form xuống dưới

### Gợi ý WPF

```xml
<VisualStateManager.VisualStateGroups>
  <VisualStateGroup x:Name="WindowStates">
    <VisualState x:Name="Wide" />
    <VisualState x:Name="Medium" />
    <VisualState x:Name="Compact" />
  </VisualStateGroup>
</VisualStateManager.VisualStateGroups>
```

---

## 9. Phong cách màu sắc và typography

### Màu chính

- Primary Blue: `#2474D8`
- Primary Blue Hover: `#1B63BE`
- Accent Green: `#20B26B`
- Accent Yellow: `#F4B740`
- Accent Red: `#E45858`
- Background: `#F5F7FB`
- Surface: `#FFFFFF`
- Text Primary: `#1E2A3A`
- Text Secondary: `#667085`
- Border: `#D9E2F2`

### Màu trạng thái slot

- Available: `#20B26B`
- Booked: `#E45858`
- Busy: `#F4B740`

### Bo góc

- button: `12-14`
- card: `20-24`
- search bar: `28-32`

### Typography

- Hero title: `36-42`
- Section title: `28-32`
- Card title: `20-22`
- Body: `15-17`

---

## 10. Mapping giao diện sang nghiệp vụ

| Khu vực UI | Chức năng nhìn thấy | Nghiệp vụ thật phía sau |
|---|---|---|
| Nút `Đăng nhập` | Mở card auth | `POST /api/v1/auth/login`, redirect theo role |
| Tab `Đăng ký` | Tạo tài khoản bệnh nhân | `POST /api/v1/auth/register`, email verify |
| Search hero | Tìm bác sĩ, dịch vụ, triệu chứng | điều hướng sang bác sĩ, dịch vụ, bài viết, hoặc flow đặt lịch |
| CTA `Đặt khám` | bắt đầu luồng booking | chọn `primary_service_id`, chọn bác sĩ, gọi `available-slots`, tạo lịch `pending` |
| Trang đặt lịch theo bác sĩ | xem thông tin bác sĩ và lịch rảnh/bận | hiển thị slot xanh/đỏ/vàng, chỉ slot xanh được đặt |
| Card bác sĩ | xem hồ sơ bác sĩ | đọc danh sách bác sĩ public |
| Card dịch vụ | preselect dịch vụ | chuẩn bị dữ liệu cho booking |
| `Lịch hẹn của tôi` | xem phản hồi từ bác sĩ | hiển thị `doctor_note`, giờ đề nghị mới, ưu đãi giảm giá nếu có |
| Trang điều khiển bác sĩ | bác sĩ quản lý duyệt lịch, bệnh nhân và khám bệnh | duyệt lịch của mình, xem bệnh nhân, kê thuốc, gửi phiếu sang dược sĩ |
| Trang điều khiển dược sĩ | dược sĩ quản lý thuốc và thanh toán | chuẩn bị thuốc, nhập kho, quản lý nhà cung cấp, thu tiền, in hóa đơn |
| Trang điều khiển quản trị | quản trị quản lý lịch khám và tài khoản | tạo tài khoản bác sĩ/dược sĩ/bệnh nhân, đặt lại mật khẩu, quản lý lịch khám |
| `Đăng xuất` | kết thúc phiên làm việc | xóa token và quay về `Trang đăng nhập` |
| Link `Quên mật khẩu` | xin email reset | `forgot-password` + `reset-password` |
| Footer policy | thông tin pháp lý | hỗ trợ compliance và niềm tin người dùng |

---

## 11. Sơ đồ layout cuối cùng

### 11.1 Trang chủ

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Logo | Đặt khám | Tư vấn | Tin y tế | Đội ngũ bác sĩ | Đăng nhập           │
├──────────────────────────────────────────────────────────────────────────────┤
│                            HERO XANH LỚN                                    │
│                 Đặt khám da liễu nhanh chóng                                │
│   Chọn bác sĩ bạn muốn, xem lịch rảnh và gửi yêu cầu đặt khám               │
│   [ Triệu chứng, bác sĩ, dịch vụ da liễu...                         🔍 ]    │
│                                                   [Ảnh minh họa]            │
├──────────────────────────────────────────────────────────────────────────────┤
│ Đặt lịch khám trực tuyến                                                     │
│ [Tìm bác sĩ] [Chọn dịch vụ] [Xem lịch trống] [Bác sĩ duyệt]                 │
├──────────────────────────────────────────────────────────────────────────────┤
│ Dịch vụ nổi bật                                                              │
│ [Mụn] [Nám] [Viêm da] [Laser] [Soi da] [Tái khám]                           │
├──────────────────────────────────────────────────────────────────────────────┤
│ Đội ngũ chuyên gia                                                           │
│ [Danh sách bác sĩ nổi bật]                     [Giới thiệu + CTA]           │
├──────────────────────────────────────────────────────────────────────────────┤
│ Kiến thức y tế                                                               │
│ [Bệnh da liễu] [Thuốc] [Chăm sóc da] [Thủ thuật]                            │
│ [Carousel bài viết]                                                          │
├──────────────────────────────────────────────────────────────────────────────┤
│ Banner tin cậy / Chính sách nội dung                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Footer đa cột + Disclaimer                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Trang đăng nhập

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Logo | Đặt khám | Tư vấn | Tin y tế | Đội ngũ bác sĩ | Đăng nhập           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   [Visual / QR / icon / giới thiệu]     [ Card auth ]                       │
│                                        ┌───────────────────────────────┐     │
│                                        │ Đăng nhập | Đăng ký          │     │
│                                        │ Email                         │     │
│                                        │ Mật khẩu                      │     │
│                                        │ [ ] Ghi nhớ    Quên mật khẩu │     │
│                                        │ [     Đăng nhập            ]  │     │
│                                        └───────────────────────────────┘     │
│   Sau đăng nhập: bệnh nhân xem lịch đã gửi, phản hồi từ bác sĩ, ưu đãi      │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│ Footer đa cột + Disclaimer                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.3 Trang đặt lịch theo bác sĩ

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Header public                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Thông tin bác sĩ]            | [Form đặt khám]                            │
│ Bác sĩ: Nguyễn ...            | Họ và tên                                  │
│ Chuyên khoa ...               | Ngày khám                                  │
│ SĐT / Email                   | Giờ khám                                   │
│                               | 🟢 08:00 - 08:30                           │
│                               | 🔴 08:30 - 09:00                           │
│                               | 🟡 09:00 - 09:30                           │
│                               | Ghi chú                                     │
│                               | [ Đặt lịch ]                                │
│                               | 🟢 Còn trống 🔴 Đã đặt 🟡 Bác sĩ bận         │
├──────────────────────────────────────────────────────────────────────────────┤
│ Footer đa cột + Disclaimer                                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.4 Trang điều khiển bác sĩ / dược sĩ

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sidebar trái | Header nội bộ | User menu | Đăng xuất                       │
├──────────────────────────────────────────────────────────────────────────────┤
│ Menu role                                                                   │
│ - Tổng quan                                                                 │
│ - Danh sách xử lý                                                           │
│ - Bảng dữ liệu                                                              │
│ - Form chi tiết                                                             │
│ - Hành động chính                                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 11.5 Trang điều khiển quản trị

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Sidebar trái | Header nội bộ | Tài khoản quản trị | Đăng xuất              │
├──────────────────────────────────────────────────────────────────────────────┤
│ [Quản lý lịch khám] [Quản lý tài khoản] [Quản lý bác sĩ] [Báo cáo]         │
│                                                                              │
│ Bảng tài khoản                                                               │
│ Mã TK | Họ tên | Email | Vai trò | Trạng thái | Người tạo | Hành động       │
│                                                                              │
│ [Thêm bác sĩ] [Thêm dược sĩ] [Thêm bệnh nhân] [Đặt lại mật khẩu]            │
│                                                                              │
│ Bảng lịch khám                                                               │
│ Bác sĩ | Ngày | Giờ | Trạng thái | Ghi chú                                  │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 12. Checklist implement

- [ ] Thay header WPF cũ bằng header public kiểu web
- [ ] Tạo `Trang chủ` với hero xanh và ô tìm kiếm lớn
- [ ] Thêm section `Đặt lịch khám trực tuyến`
- [ ] Thêm section dịch vụ da liễu nổi bật
- [ ] Thêm section đội ngũ chuyên gia
- [ ] Thêm section bài viết kiến thức y tế
- [ ] Thêm footer đa cột + disclaimer
- [ ] Tạo `Trang đăng nhập` dùng cùng header/footer
- [ ] Card auth có tab `Đăng nhập` và `Đăng ký`
- [ ] Form đăng nhập giữ `email + password`, không đổi sang phone-only
- [ ] Form đăng ký chỉ tạo vai trò bệnh nhân
- [ ] Link `Quên mật khẩu` đi đúng API hiện có
- [ ] Tạo `Trang đặt lịch theo bác sĩ` kiểu 2 cột giống ảnh tham chiếu số 1
- [ ] Hiển thị slot với 3 màu: xanh còn trống, đỏ đã đặt, vàng bác sĩ bận
- [ ] Tất cả CTA `Đặt khám` đi theo luồng chọn bác sĩ -> xem giờ rảnh -> tạo lịch `pending`
- [ ] Bổ sung màn hình `Lịch hẹn của tôi` để bệnh nhân xem bác sĩ duyệt, ghi chú hoãn và ưu đãi
- [ ] Bổ sung cột `Bệnh nhân` trong trang làm việc của bác sĩ
- [ ] Bác sĩ chỉ xem lịch của mình, không tự quản lý lịch khám tổng thể
- [ ] Chỉ quản trị mới được quản lý lịch khám
- [ ] Chỉ quản trị mới được tạo tài khoản bác sĩ và dược sĩ
- [ ] Bổ sung chức năng quản trị đặt lại mật khẩu tài khoản
- [ ] Sau login vai trò bác sĩ điều hướng vào trang điều khiển bác sĩ, không hiển thị trang chủ
- [ ] Sau login vai trò dược sĩ điều hướng vào trang điều khiển dược sĩ, không hiển thị trang chủ
- [ ] `Đăng xuất` luôn quay về `Trang đăng nhập`

---

## 13. Kết luận

Spec mới này thay thế định hướng WPF nội bộ cũ bằng một layout public hiện đại hơn cho:

- `Trang chủ`
- `Đăng nhập / Đăng ký`

Điểm quan trọng nhất là:

- **giao diện bám sát ảnh tham chiếu**
- **logic vẫn bám chặt tài liệu nghiệp vụ gốc**
- **không làm sai luồng auth, booking, role và status của hệ thống**
