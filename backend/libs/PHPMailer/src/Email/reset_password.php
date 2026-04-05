<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../config/db_connect.php';

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['reset_password'])) {
    $reset_code        = clean_input($_POST['verification_code']);
    $new_password      = $_POST['new_password'];
    $confirm_password  = $_POST['confirm_password'];
    $email             = clean_input($_POST['email']);

    if ($new_password !== $confirm_password) {
        echo "<script>alert('Mật khẩu mới và xác nhận mật khẩu không khớp!'); window.location.href='../../frontend/index.php?show_modal=true&form=verify&email=" . urlencode($email) . "';</script>";
        exit;
    }

    $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
    $current_time = date("Y-m-d H:i:s");

    // Validate email
    if (!is_valid_email($email)) {
        echo "<script>alert('Email không hợp lệ!'); window.location.href='../../frontend/index.php';</script>";
        exit;
    }
    
    // Validate password
    if (strlen($new_password) < 8) {
        echo "<script>alert('Mật khẩu phải có ít nhất 8 ký tự!'); window.location.href='../../frontend/index.php?show_modal=true&form=verify&email=" . urlencode($email) . "';</script>";
        exit;
    }

    $sql = "SELECT u.ma_tai_khoan 
            FROM tai_khoan u
            WHERE u.email = '$email' 
            AND u.reset_code = '$reset_code' 
            AND u.reset_code_expires_at > '$current_time'
            AND u.vai_tro = 'benh_nhan'";
    
    $result = mysqli_query($conn, $sql);

    if (mysqli_num_rows($result) == 0) {
        echo "<script>alert('Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng thử lại!'); window.location.href='../../frontend/index.php?show_modal=true&form=forgot';</script>";
        exit;
    }

    $row = mysqli_fetch_assoc($result);
    $user_id = $row['ma_tai_khoan'];

    $updateSql = "UPDATE tai_khoan 
                  SET mat_khau = '$hashed_password', reset_code = NULL, reset_code_expires_at = NULL 
                  WHERE ma_tai_khoan = $user_id";
    
    if (mysqli_query($conn, $updateSql)) {
        echo "<script>alert('Đặt lại mật khẩu thành công! Vui lòng đăng nhập.'); window.location.href='../../frontend/index.php?show_modal=true&form=login';</script>";
    } else {
        echo "Lỗi khi cập nhật mật khẩu: " . mysqli_error($conn);
    }

} else {
    header("Location: ../../frontend/index.php");
    exit();
}
?>