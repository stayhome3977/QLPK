<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Database configuration - kết nối với database của dự án
$host = 'localhost';
$dbname = 'phong_kham_da_lieu';
$username = 'root';
$password = 'hoangafk123';

// Tạo kết nối
try {
    $conn = new mysqli($host, $username, $password, $dbname);
    
    // Kiểm tra kết nối
    if ($conn->connect_error) {
        die("Kết nối database thất bại: " . $conn->connect_error);
    }
    
    // Set charset to UTF-8
    $conn->set_charset("utf8mb4");
    
} catch (Exception $e) {
    die("Lỗi kết nối database: " . $e->getMessage());
}

// Hàm helper để escape và validate input
function clean_input($data) {
    global $conn;
    $data = trim($data);
    $data = stripslashes($data);
    $data = htmlspecialchars($data);
    return $conn->real_escape_string($data);
}

// Hàm kiểm tra email hợp lệ
function is_valid_email($email) {
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
}

// Hàm log lỗi
function log_error($message) {
    $log_file = __DIR__ . '/../../logs/error.log';
    $timestamp = date('Y-m-d H:i:s');
    $log_message = "[$timestamp] $message\n";
    file_put_contents($log_file, $log_message, FILE_APPEND | LOCK_EX);
}
?>
