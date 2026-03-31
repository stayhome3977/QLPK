# Cải thiện Layout WPF -- Hệ thống Quản lý Phòng Khám Da Liễu

---

## 1. Bổ sung Header (thiếu hoàn toàn trong spec gốc)

Header nằm ở trên cùng toàn bộ cửa sổ, chiều cao khoảng **48px**.

```
------------------------------------------------------------------------
|  🏥 Phòng Khám Da Liễu  |  [🔔 3]  |  Lễ tân: Nguyễn Thị Lan  [⬇] |
------------------------------------------------------------------------
```

### Nội dung Header bao gồm

- **Logo + tên hệ thống** (bên trái)
- **Icon thông báo** kèm badge số lượng chưa đọc (giữa phải)
- **Tên người dùng + role đang đăng nhập** (bên phải)
- **Dropdown** gồm: Đổi mật khẩu / Đăng xuất
- **Đồng hồ và ngày hiện tại** (tuỳ chọn, hữu ích cho lễ tân)

### Control WPF

```
<DockPanel> hoặc <Grid> với 3 cột: Auto | * | Auto
<TextBlock> tên hệ thống
<Button> icon thông báo + Badge (Adorner hoặc overlay)
<StackPanel> thông tin người dùng + ContextMenu
```

---

## 2. Sidebar — Bổ sung badge số lượng chờ xử lý

### Vấn đề gốc

Menu hiện tại chỉ là danh sách tên module, không cho biết có bao nhiêu việc đang chờ.

### Cải thiện

```
------------------------------------------
|  🏥 Quản lý phòng khám da liễu         |
------------------------------------------
|  Dashboard                             |
|  Lịch hẹn                     [ 12 ]  |
|  Bệnh nhân                             |
|  Khám bệnh                    [  3 ]  |
|  Đơn thuốc                    [  5 ]  |
|  Kho thuốc                    [  2 ]  |  ← cảnh báo thuốc sắp hết
|  Hóa đơn                      [  7 ]  |
|  Báo cáo                               |
------------------------------------------
```

- Badge **đỏ** = cần xử lý gấp (ví dụ: bệnh nhân đang chờ quá lâu)
- Badge **xanh** = thông tin thông thường
- Badge **vàng** = cảnh báo (thuốc sắp hết, lịch chưa xác nhận)

### Control WPF

```xml
<Grid>
  <TextBlock Text="Lịch hẹn" />
  <Border CornerRadius="10" Background="Red">
    <TextBlock Text="{Binding PendingCount}" />
  </Border>
</Grid>
```

---

## 3. Toolbar — Quy tắc Enable/Disable theo trạng thái lịch hẹn

### Vấn đề gốc

8 nút hiển thị cùng lúc mà không có quy tắc kích hoạt rõ ràng, gây rối cho người dùng.

### Bảng quy tắc Enable/Disable

| Nút            | pending | confirmed | checked_in | in_progress | completed | cancelled |
|----------------|:-------:|:---------:|:----------:|:-----------:|:---------:|:---------:|
| Tạo lịch       | ✅      | ✅        | ✅         | ✅          | ✅        | ✅        |
| Xác nhận       | ✅      | ❌        | ❌         | ❌          | ❌        | ❌        |
| Check-in       | ❌      | ✅        | ❌         | ❌          | ❌        | ❌        |
| Bắt đầu khám   | ❌      | ❌        | ✅         | ❌          | ❌        | ❌        |
| Hoàn thành     | ❌      | ❌        | ❌         | ✅          | ❌        | ❌        |
| Đổi lịch       | ✅      | ✅        | ❌         | ❌          | ❌        | ❌        |
| Hủy lịch       | ✅      | ✅        | ✅         | ❌          | ❌        | ❌        |
| Làm mới        | ✅      | ✅        | ✅         | ✅          | ✅        | ✅        |

### Binding trong WPF

```csharp
// Trong ViewModel
public bool CanConfirm => SelectedAppointment?.Status == "pending";
public bool CanCheckIn => SelectedAppointment?.Status == "confirmed";
public bool CanStartExam => SelectedAppointment?.Status == "checked_in";
```

```xml
<Button Content="Xác nhận"
        IsEnabled="{Binding CanConfirm}"
        Command="{Binding ConfirmCommand}" />
```

---

## 4. Toolbar — Bổ sung bộ lọc ngày và trạng thái

### Vấn đề gốc

Section 6 chỉ *gợi ý* lọc dữ liệu nhưng không mô tả control cụ thể. Bộ lọc ngày là thứ người dùng dùng liên tục.

### Layout Toolbar đầy đủ sau cải thiện

```
[ Tạo lịch ] [ Xác nhận ] [ Check-in ] [ Bắt đầu khám ] [ Hoàn thành ]
[ Đổi lịch ] [ Hủy lịch ] [ Làm mới ]
────────────────────────────────────────────────────────────────────────
📅 [01/04/2026]  👨‍⚕️ [-- Tất cả bác sĩ --]  🔘 [-- Trạng thái --]
🔍 [Tìm theo tên bệnh nhân / số điện thoại...]
```

### Control WPF

```xml
<StackPanel Orientation="Horizontal">
  <DatePicker x:Name="FilterDate"
              SelectedDate="{Binding FilterDate}" />
  <ComboBox ItemsSource="{Binding DoctorList}"
            SelectedItem="{Binding SelectedDoctor}" />
  <ComboBox ItemsSource="{Binding StatusList}"
            SelectedItem="{Binding SelectedStatus}" />
  <TextBox Text="{Binding SearchKeyword, UpdateSourceTrigger=PropertyChanged}"
           Width="250" />
</StackPanel>
```

---

## 5. Khu chi tiết lịch hẹn — Dùng TabControl thay form phẳng

### Vấn đề gốc

Form phẳng 6 dòng sẽ bị chật khi cần hiển thị thêm dịch vụ phát sinh, lịch sử thay đổi, hoặc ghi chú từ bác sĩ.

### Layout sau cải thiện

```
--------------------------------------------------------------------
| [Thông tin chung] | [Dịch vụ] | [Lịch sử thay đổi] | [Liên kết] |
--------------------------------------------------------------------
|                                                                  |
|   Nội dung tab tương ứng hiển thị tại đây                       |
|                                                                  |
|                           [ Lưu ]  [ Hủy thay đổi ]            |
--------------------------------------------------------------------
```

### Chi tiết từng tab

**Tab 1 — Thông tin chung** (giống form gốc, giữ nguyên)
```
| Mã lịch:     [_______]   Trạng thái: [_______]  |
| Bệnh nhân:   [_______]   SĐT:        [_______]  |
| Bác sĩ:      [_______]   Dịch vụ:   [_______]  |
| Ngày khám:   [_______]   Giờ khám:  [_______]  |
| Loại khám:   [_______]   Nguồn đặt: [_______]  |
| Ghi chú:     [________________________________] |
```

**Tab 2 — Dịch vụ phát sinh**
```
| STT | Tên dịch vụ        | Số lượng | Đơn giá  | Thành tiền |
|  1  | Trị mụn cơ bản     |    1     | 350,000  |  350,000   |
|  2  | Laser tàn nhang     |    1     | 500,000  |  500,000   |
|                          |          | Tổng:    |  850,000   |
```

**Tab 3 — Lịch sử thay đổi**
```
| Thời gian        | Người thực hiện | Hành động              |
| 01/04 08:00      | Lễ tân Lan      | Tạo lịch               |
| 01/04 08:15      | Lễ tân Lan      | Xác nhận lịch          |
| 01/04 08:45      | Lễ tân Lan      | Check-in               |
| 01/04 09:10      | BS Minh         | Bắt đầu khám           |
```

**Tab 4 — Liên kết nhanh**
```
[ 📋 Mở hồ sơ bệnh nhân ]  [ 🩺 Mở bệnh án ]
[ 💊 Mở đơn thuốc ]        [ 🧾 Mở hóa đơn ]
```

### Nút Lưu / Hủy thay đổi

Phải có nút tường minh, **không lưu ngầm** khi click ra ngoài:

```xml
<StackPanel Orientation="Horizontal" HorizontalAlignment="Right">
  <Button Content="Lưu" Command="{Binding SaveCommand}" />
  <Button Content="Hủy thay đổi" Command="{Binding CancelCommand}" />
</StackPanel>
```

---

## 6. Vùng thông báo / StatusBar

### Vấn đề gốc

Không có nơi hiển thị thông báo realtime (bệnh nhân check-in, đơn thuốc mới, thuốc sắp hết).

### Hai phương án

**Phương án A — StatusBar ở dưới cùng**
```
------------------------------------------------------------------------
|  ✅ Lịch hẹn #042 đã được xác nhận  |  🟢 Kết nối DB: OK  | 09:32  |
------------------------------------------------------------------------
```

```xml
<StatusBar DockPanel.Dock="Bottom">
  <StatusBarItem>
    <TextBlock Text="{Binding StatusMessage}" />
  </StatusBarItem>
  <Separator />
  <StatusBarItem>
    <TextBlock Text="{Binding CurrentTime}" />
  </StatusBarItem>
</StatusBar>
```

**Phương án B — Toast notification (ưu tiên hơn)**

Hiển thị popup nhỏ góc dưới phải trong 5 giây rồi tự tắt:

```
                              ┌─────────────────────────┐
                              │ 🔔 Bệnh nhân Nguyễn A   │
                              │    vừa check-in          │
                              └─────────────────────────┘
```

Dùng thư viện: **Notification.Wpf** hoặc tự implement bằng `Popup` + animation.

---

## 7. Màu sắc trạng thái trong DataGrid

### Cải thiện

Tô màu nền dòng theo trạng thái lịch hẹn để người dùng nhận biết nhanh:

| Trạng thái   | Màu nền       | Màu chữ  |
|--------------|---------------|----------|
| pending      | `#FFF9C4`     | `#F57F17` (vàng đậm)  |
| confirmed    | `#E3F2FD`     | `#1565C0` (xanh đậm)  |
| checked_in   | `#E8F5E9`     | `#2E7D32` (xanh lá)   |
| in_progress  | `#EDE7F6`     | `#4527A0` (tím)        |
| completed    | `#F5F5F5`     | `#616161` (xám)        |
| cancelled    | `#FFEBEE`     | `#B71C1C` (đỏ)         |

### Implement trong WPF

```xml
<DataGrid.RowStyle>
  <Style TargetType="DataGridRow">
    <Style.Triggers>
      <DataTrigger Binding="{Binding Status}" Value="pending">
        <Setter Property="Background" Value="#FFF9C4" />
      </DataTrigger>
      <DataTrigger Binding="{Binding Status}" Value="checked_in">
        <Setter Property="Background" Value="#E8F5E9" />
      </DataTrigger>
      <!-- ... các trạng thái còn lại -->
    </Style.Triggers>
  </Style>
</DataGrid.RowStyle>
```

---

## 8. Responsive khi resize cửa sổ

### Quy tắc Grid columns

```xml
<Grid>
  <!-- Sidebar: cố định 220px -->
  <Grid.ColumnDefinitions>
    <ColumnDefinition Width="220" MinWidth="180" MaxWidth="280" />
    <ColumnDefinition Width="*" />   <!-- Nội dung: chiếm phần còn lại -->
  </Grid.ColumnDefinitions>
</Grid>
```

### Quy tắc Grid rows trong khu nội dung

```xml
<Grid>
  <Grid.RowDefinitions>
    <RowDefinition Height="Auto" />       <!-- Toolbar: vừa đủ nội dung -->
    <RowDefinition Height="2*" />         <!-- DataGrid: 2 phần -->
    <RowDefinition Height="1*"
                   MinHeight="180" />     <!-- Chi tiết: 1 phần, tối thiểu 180px -->
  </Grid.RowDefinitions>
</Grid>
```

### GridSplitter giữa DataGrid và khu chi tiết

Cho phép người dùng kéo thay đổi tỉ lệ:

```xml
<GridSplitter Grid.Row="1"
              Height="5"
              HorizontalAlignment="Stretch"
              Background="#E0E0E0"
              Cursor="SizeNS" />
```

---

## 9. Sơ đồ layout cuối cùng sau cải thiện

```
────────────────────────────────────────────────────────────────────────
|  🏥 Phòng Khám Da Liễu          [🔔 3]    Lễ tân: Nguyễn Thị Lan ⬇ |
────────────────────────────────────────────────────────────────────────
| MENU TRÁI       | [ Tạo lịch ] [ Xác nhận* ] [ Check-in ] ...        |
|                 | 📅 [01/04/26]  👨‍⚕️[Tất cả bác sĩ] 🔘[Trạng thái]    |
| Dashboard       | 🔍 [Tìm tên / SĐT...]                               |
| Lịch hẹn [12]  |─────────────────────────────────────────────────── |
| Bệnh nhân       |                                                     |
| Khám bệnh [ 3] |           DATA GRID LỊCH HẸN (có màu trạng thái)   |
| Đơn thuốc [ 5] |                                                     |
| Kho thuốc [ 2] |═══════════════ GridSplitter ════════════════════════|
| Hóa đơn   [ 7] | [Thông tin chung][Dịch vụ][Lịch sử][Liên kết]      |
| Báo cáo         |    Nội dung tab...              [Lưu] [Hủy]        |
────────────────────────────────────────────────────────────────────────
| ✅ Lịch #042 đã xác nhận                         🟢 DB: OK  | 09:32 |
────────────────────────────────────────────────────────────────────────
```

*Nút được bôi đậm = đang enable theo trạng thái lịch hẹn đang chọn*

---

## 10. Chống sai sót (Confirmation / Undo)

### Vấn đề
Với các thao tác quan trọng (như Hủy lịch khám) hoặc dễ bấm nhầm (Check-in nhầm người), việc chỉ khóa nút (Enable/Disable) là chưa đủ an toàn. Cần có cơ chế bảo vệ khỏi thao tác sai của người dùng.

### Giải pháp cải thiện

**1. Hộp thoại Xác nhận (Confirmation Dialog)**
Dành cho các hành động xóa hoặc hủy trạng thái không thể khôi phục tự động:
```xml
<!-- Nút Hủy lịch gọi đến Command có luồng xác nhận Dialog -->
<Button Content="Hủy lịch" Command="{Binding CancelAppointmentCommand}" />
```
*Note: Cần tích hợp luồng xác nhận cảnh báo `Yes/No` trước khi thay đổi trạng thái trong C# ViewModel.*

**2. Snackbar / Toast notification kèm theo nút Hoàn tác (Undo)**
Dành cho các hành động chuyển trạng thái an toàn (như Check-in hoặc đổi trạng thái hoàn thành). Khác với Dialog bắt người dùng bấm Yes/No mệt mỏi, hệ thống xử lý ngay phần việc và chớp nhoáng hiện thông báo ở góc màn hình trong vòng ~5 giây cho phép người dùng rút lại hành động vừa xong nếu nhỡ tay.
```
┌──────────────────────────────────────────────┐
│  ✅  Lịch hẹn #042 đã Check-in               │
│                                              │
│                            [ HOÀN TÁC ]      │
└──────────────────────────────────────────────┘
```

---

## 11. Tóm tắt checklist cải thiện

- [ ] Thêm **Header** với thông tin người dùng, nút đăng xuất, thông báo
- [ ] Thêm **badge số lượng** trên từng menu item trong Sidebar
- [ ] Thêm **bảng enable/disable nút** Toolbar theo trạng thái lịch
- [ ] Thêm **DatePicker + ComboBox lọc** ngay trên DataGrid
- [ ] Thay form phẳng bằng **TabControl** ở khu chi tiết
- [ ] Thêm nút **Lưu / Hủy thay đổi** tường minh
- [ ] Thêm **StatusBar** hoặc **Toast notification**
- [ ] Thêm **màu trạng thái** cho từng dòng trong DataGrid
- [ ] Định nghĩa rõ **kích thước cố định / co giãn** trong Grid
- [ ] Thêm **GridSplitter** giữa DataGrid và khu chi tiết
- [ ] Bổ sung tính năng **Xác nhận (Confirm)** hoặc **Hoàn tác (Undo)** bảo vệ thao tác quan trọng