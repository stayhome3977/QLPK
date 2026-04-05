<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../config/db_connect.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once '../PHPMailer.php';
require_once '../SMTP.php';
require_once '../Exception.php';

if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['send_code'])) {
    $email = clean_input($_POST['email']);
    
    // Validate email
    if (!is_valid_email($email)) {
        echo "<script>alert('Email không hợp lệ!'); window.location.href='../../frontend/index.php';</script>";
        exit;
    }

    $sql = "SELECT u.ma_tai_khoan, u.ho_ten
            FROM tai_khoan u
            WHERE u.email = '$email' AND u.vai_tro = 'benh_nhan'";
    
    $result = mysqli_query($conn, $sql);

    if (mysqli_num_rows($result) == 0) {
        echo "<script>alert('Email không tồn tại trong hệ thống!'); window.location.href='../../frontend/index.php';</script>";
        exit;
    }

    $row = mysqli_fetch_assoc($result);
    $user_id = $row['ma_tai_khoan'];
    $full_name = $row['ho_ten'];

    $resetCode = str_pad(mt_rand(1, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date("Y-m-d H:i:s", strtotime('+10 minutes'));

    $updateSql = "UPDATE tai_khoan SET reset_code = '$resetCode', reset_code_expires_at = '$expiresAt' WHERE ma_tai_khoan = $user_id";
    mysqli_query($conn, $updateSql);

    $smtpUser = 'tronghoang3977@gmail.com';
    $smtpPass = 'mwob uoqe mhgf hscq';

    $subject = "Mã Đặt Lại Mật Khẩu (OTP)";
    $message = '
        <h1>Mã Xác Thực của bạn là:</h1>
        <div style="text-align: center; margin: 20px 0; background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
            <strong style="font-size: 24px; color: #dc3545;">' . $resetCode . '</strong>
        </div>
        <p>Mã này sẽ hết hiệu lực sau 10 phút. Không chia sẻ mã này với bất kỳ ai.</p>
    ';

    try {
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';

        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = $smtpUser;
        $mail->Password   = $smtpPass;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;

        $mail->setFrom($smtpUser, 'Hospital System');
        $mail->addAddress($email, $full_name);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $message;

        $mail->send();

        echo "<script>alert('Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.'); window.location.href='../../frontend/index.php?show_modal=true&form=verify&email=" . urlencode($email) . "';</script>";

    } catch (Exception $e) {
        error_log("PHPMailer error (Reset Code): " . $mail->ErrorInfo . "\n", 3, __DIR__ . "/mail_error.log");
        echo "<script>alert('Lỗi khi gửi email xác thực. Vui lòng thử lại sau.'); window.location.href='../../frontend/index.php';</script>";
    }

} else {
    header("Location: ../../frontend/index.php");
    exit();
}
?>