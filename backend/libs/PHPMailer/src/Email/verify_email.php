<?php


require_once  'db_connect.php';

if (isset($_GET['token']) && !empty($_GET['token'])) {
    $token = $_GET['token'];

    // Tìm user có activation_token khớp và chưa được kích hoạt
    $sql = "SELECT user_id FROM users WHERE activation_token = ? AND is_active = 0";
    $stmt = $conn->prepare($sql);
    
    if ($stmt) {
        $stmt->bind_param("s", $token);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($user = $result->fetch_assoc()) {
            $user_id = $user['user_id'];

            // Cập nhật trạng thái kích hoạt và xóa token
            $updateSql = "UPDATE users SET is_active = 1, activation_token = NULL WHERE user_id = ?";
            $updateStmt = $conn->prepare($updateSql);
            $updateStmt->bind_param("i", $user_id);
            
            if ($updateStmt->execute()) {
                $updateStmt->close();
                $stmt->close();
                echo "<script>alert('Xác thực tài khoản thành công! Bạn đã có thể đăng nhập.'); window.location.href='../../frontend/pages/login.php';</script>";
            } else {
                $updateStmt->close();
                $stmt->close();
                echo "<script>alert('Lỗi: Không thể kích hoạt tài khoản trong CSDL. Vui lòng thử lại.'); window.location.href='frontend/index.php';</script>";
            }
        } else {
            $stmt->close();
            echo "<script>alert('Liên kết xác thực không hợp lệ, đã hết hạn, hoặc tài khoản đã được kích hoạt.'); window.location.href='frontend/index.php';</script>";
        }
    } else {
        echo "<script>alert('Lỗi hệ thống khi chuẩn bị truy vấn.'); window.location.href='frontend/index.php';</script>";
    }
} else {
    echo "<script>alert('Liên kết xác thực không hợp lệ.'); window.location.href='frontend/index.php';</script>";
}
?>