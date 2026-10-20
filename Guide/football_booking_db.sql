-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Oct 20, 2026 at 01:38 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `football_booking_db`
--
CREATE DATABASE IF NOT EXISTS `football_booking_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `football_booking_db`;

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `pitch_id` int(11) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `booking_date` date NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(15) NOT NULL,
  `total_price` decimal(10,0) NOT NULL,
  `promotion_id` int(11) DEFAULT NULL,
  `discount_amount` decimal(10,0) DEFAULT 0,
  `status` enum('pending','confirmed','checked_in','completed','cancelled') DEFAULT 'pending',
  `payment_status` enum('unpaid','deposited','paid') DEFAULT 'unpaid',
  `created_by_user_id` int(11) DEFAULT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `customer_id`, `pitch_id`, `start_time`, `end_time`, `booking_date`, `customer_name`, `customer_phone`, `total_price`, `promotion_id`, `discount_amount`, `status`, `payment_status`, `created_by_user_id`, `note`, `created_at`) VALUES
(4, NULL, 4, '10:30:00', '11:30:00', '2026-10-09', 'anh huy', '0945098987', 100000, NULL, 0, 'cancelled', 'unpaid', NULL, NULL, '2026-10-09 07:55:16'),
(5, NULL, 4, '06:30:00', '07:30:00', '2026-10-09', 'anh huy', '0945098987', 100000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-09 08:39:15'),
(6, 3, 4, '09:00:00', '10:00:00', '2026-10-09', 'anh huy', '0945098987', 100000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-09 09:25:08'),
(7, NULL, 4, '05:30:00', '06:30:00', '2026-10-05', 'a', '0978787', 100000, NULL, 0, 'cancelled', 'unpaid', 1, NULL, '2026-10-09 09:58:35'),
(8, 3, 4, '17:00:00', '18:00:00', '2026-10-09', 'anh huy', '0945098987', 175000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-09 10:00:32'),
(9, 3, 4, '05:30:00', '06:30:00', '2026-10-09', 'anh huy', '0945098987', 100000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-09 10:09:34'),
(10, 3, 4, '18:30:00', '19:30:00', '2026-10-09', 'anh huy', '0945098987', 220000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-09 11:26:38'),
(11, 4, 4, '21:30:00', '22:30:00', '2026-10-16', 'anhlong', '0901234567', 200000, NULL, 0, 'cancelled', 'unpaid', NULL, NULL, '2026-10-16 04:27:39'),
(12, 4, 4, '17:30:00', '18:30:00', '2026-10-16', 'anhlong', '0901234567', 197500, NULL, 0, 'cancelled', 'unpaid', NULL, NULL, '2026-10-16 04:27:47'),
(13, 4, 4, '21:30:00', '22:30:00', '2026-10-16', 'anhlong', '0901234567', 200000, NULL, 0, 'cancelled', 'unpaid', NULL, NULL, '2026-10-16 04:28:21'),
(14, 4, 4, '14:00:00', '15:00:00', '2026-10-16', 'anhlong', '0901234567', 175000, NULL, 0, 'cancelled', 'unpaid', NULL, NULL, '2026-10-16 04:29:57'),
(15, 4, 4, '16:00:00', '17:00:00', '2026-10-16', 'anhlong', '0901234567', 175000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-16 04:46:50'),
(16, 4, 4, '20:00:00', '21:00:00', '2026-10-16', 'anhlong', '0901234567', 220000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-16 04:47:02'),
(17, 4, 6, '14:30:00', '15:30:00', '2026-10-16', 'anhlong', '0901234567', 150000, NULL, 0, 'completed', 'paid', NULL, NULL, '2026-10-16 07:05:26'),
(18, 4, 7, '16:30:00', '17:30:00', '2026-10-16', 'anhlong', '0901234567', 450000, NULL, 0, 'confirmed', 'unpaid', NULL, NULL, '2026-10-16 09:03:09'),
(19, 4, 6, '16:30:00', '17:30:00', '2026-10-16', 'anhlong', '0901234567', 150000, NULL, 0, 'confirmed', 'unpaid', NULL, NULL, '2026-10-16 09:03:16'),
(20, 4, 8, '16:30:00', '17:30:00', '2026-10-16', 'anhlong', '0901234567', 150000, NULL, 0, 'confirmed', 'unpaid', NULL, NULL, '2026-10-16 09:03:21'),
(21, 4, 6, '17:30:00', '18:30:00', '2026-10-16', 'anhlong', '0901234567', 185000, NULL, 0, 'confirmed', 'unpaid', NULL, NULL, '2026-10-16 09:03:25'),
(22, 4, 7, '17:30:00', '18:30:00', '2026-10-16', 'anhlong', '0901234567', 555000, NULL, 0, 'confirmed', 'unpaid', NULL, NULL, '2026-10-16 09:03:28'),
(23, 1, 4, '19:00:00', '20:00:00', '2026-10-17', 'Nguyễn Văn Khách', '0987654321', 270000, NULL, 0, 'pending', 'unpaid', NULL, 'Test bot', '2026-10-16 12:12:13'),
(24, 7, 4, '21:00:00', '22:00:00', '2026-10-16', 'volue', '0888888888', 220000, NULL, 0, 'pending', 'unpaid', NULL, NULL, '2026-10-16 12:29:36');

-- --------------------------------------------------------

--
-- Table structure for table `booking_services`
--

DROP TABLE IF EXISTS `booking_services`;
CREATE TABLE `booking_services` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `service_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 1,
  `unit_price` decimal(10,0) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `booking_services`
--

INSERT INTO `booking_services` (`id`, `booking_id`, `service_id`, `quantity`, `unit_price`, `created_at`) VALUES
(1, 5, 6, 1, 10000, '2026-10-09 08:39:22');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `phone` varchar(15) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `phone`, `password`, `full_name`, `avatar_url`, `is_active`, `created_at`) VALUES
(1, '0987654321', '$2a$10$uGa9B4LsTfHS2NHi6IK62e46jhUPxKCgLQyA.PJ/8fivqyHzsliiK', 'Nguyễn Văn Khách', NULL, 1, '2026-10-08 08:41:58'),
(2, '0909898987', '$2b$10$ZZLM97lhyUlZH8CD7L4RoO4hGKcTnMWt7B74PMyiYpMmUnRYUhjGO', 'kuna', NULL, 1, '2026-10-08 10:03:12'),
(3, '0945098987', '$2b$10$ycfrleHlHYTU9u7ybnim5.nXiTr2zclOxrvTWR5RxgpDnaT.34VVK', 'anh huy', NULL, 1, '2026-10-09 04:56:03'),
(4, '0901234567', '$2a$10$GPOLN.YfADxILC5DIMM3Ouz2qqzM8q3sKMUH4P1AwErNc42Ybi8Be', 'anhlong', NULL, 1, '2026-10-16 04:25:47'),
(5, '22222222', '$2a$10$G1LIUBjemxuSlu5bNipbtOHcgcSD4l1COF7llmrTaslC/w0U3BDYq', 'zzx', NULL, 1, '2026-10-16 09:16:30'),
(6, '0372092031', '$2a$10$cPQ0ocVoGYjC8GSFVGinc.dH3nuFUAUjHhrE1qf8QgazLXFsObwsS', 'tao la huy', NULL, 1, '2026-10-16 11:05:53'),
(7, '0888888888', '$2a$10$evZRMWSznu3DQXdoIj9DCedRvgskCeQrfxtsf6ulIS.qvEeFWXNBm', 'volue', NULL, 1, '2026-10-16 12:06:50');

-- --------------------------------------------------------

--
-- Table structure for table `match_requests`
--

DROP TABLE IF EXISTS `match_requests`;
CREATE TABLE `match_requests` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `host_name` varchar(100) NOT NULL,
  `host_phone` varchar(15) NOT NULL,
  `skill_level` varchar(50) DEFAULT 'Giao lưu vui vẻ',
  `split_cost` enum('50-50','thua_tra_het','host_bao') DEFAULT '50-50',
  `description` text DEFAULT NULL,
  `status` enum('open','matched','cancelled') DEFAULT 'open',
  `challenger_name` varchar(100) DEFAULT NULL,
  `challenger_phone` varchar(15) DEFAULT NULL,
  `matched_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL,
  `recipient_type` enum('customer','admin_staff') NOT NULL,
  `phone_number` varchar(15) DEFAULT NULL,
  `title` varchar(150) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `reference_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `recipient_type`, `phone_number`, `title`, `message`, `type`, `reference_id`, `is_read`, `created_at`) VALUES
(1, 'admin_staff', NULL, 'Đơn Đặt Sân Mới', 'Khách hàng kuna vừa đặt sân cho ngày 2026-10-08. Vui lòng duyệt đơn!', 'new_booking', 1, 0, '2026-10-08 10:07:31');

-- --------------------------------------------------------

--
-- Table structure for table `pitches`
--

DROP TABLE IF EXISTS `pitches`;
CREATE TABLE `pitches` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `type` varchar(20) NOT NULL,
  `price_default` decimal(10,0) NOT NULL,
  `status` varchar(20) DEFAULT 'active',
  `avatar_url` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pitches`
--

INSERT INTO `pitches` (`id`, `name`, `type`, `price_default`, `status`, `avatar_url`) VALUES
(4, 'sân 5 A', 'Sân 5', 100000, 'active', 'http://localhost:5000/uploads/pitches/pitch-1791532264655-599523116.jpg'),
(5, 'Sân 5 B', 'Sân 5', 100000, 'active', 'http://localhost:5000/uploads/pitches/pitch-1792126068551-970825831.jpg'),
(6, 'sân 5 C', 'Sân 5', 100000, 'active', 'http://localhost:5000/uploads/pitches/pitch-1792126084737-564541291.jpg'),
(7, 'Sân 7A', 'Sân 7', 300000, 'active', 'http://localhost:5000/uploads/pitches/pitch-1792126309212-458188786.webp'),
(8, 'Sân 5 D', 'Sân 5', 100000, 'active', 'http://localhost:5000/uploads/pitches/pitch-1792127969264-806457879.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `pitch_images`
--

DROP TABLE IF EXISTS `pitch_images`;
CREATE TABLE `pitch_images` (
  `id` int(11) NOT NULL,
  `pitch_id` int(11) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `caption` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pitch_images`
--

INSERT INTO `pitch_images` (`id`, `pitch_id`, `image_url`, `caption`, `created_at`) VALUES
(5, 4, 'http://localhost:5000/uploads/pitches/pitch-1792138194822-688978798.jpg', NULL, '2026-10-16 08:09:54'),
(6, 4, 'http://localhost:5000/uploads/pitches/pitch-1792138199198-111511614.jpg', NULL, '2026-10-16 08:09:59');

-- --------------------------------------------------------

--
-- Table structure for table `pitch_reviews`
--

DROP TABLE IF EXISTS `pitch_reviews`;
CREATE TABLE `pitch_reviews` (
  `id` int(11) NOT NULL,
  `pitch_id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(20) DEFAULT NULL,
  `rating` int(11) NOT NULL DEFAULT 5,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pitch_reviews`
--

INSERT INTO `pitch_reviews` (`id`, `pitch_id`, `customer_name`, `customer_phone`, `rating`, `comment`, `created_at`) VALUES
(1, 4, 'Nguy?n Van Nam', '0901234567', 5, 'M?t c? �m, d�n chi?u s�ng ban d�m r?t t?t!', '2026-10-16 07:53:15'),
(2, 4, 'anhlong', '0901234567', 5, 'zzzzzzz', '2026-10-16 08:10:40');

-- --------------------------------------------------------

--
-- Table structure for table `pricing_rules`
--

DROP TABLE IF EXISTS `pricing_rules`;
CREATE TABLE `pricing_rules` (
  `id` int(11) NOT NULL,
  `day_type` enum('weekday','weekend') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `pitch_type` varchar(50) NOT NULL,
  `hourly_rate` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `pricing_rules`
--

INSERT INTO `pricing_rules` (`id`, `day_type`, `start_time`, `end_time`, `pitch_type`, `hourly_rate`) VALUES
(1, 'weekday', '05:30:00', '16:30:00', 'Sân 5', 150000),
(2, 'weekday', '05:30:00', '16:30:00', 'Sân 6', 200000),
(3, 'weekday', '05:30:00', '16:30:00', 'Sân 7', 220000),
(4, 'weekday', '05:30:00', '16:30:00', 'Sân 11', 1100000),
(5, 'weekday', '16:30:00', '17:30:00', 'Sân 5', 270000),
(6, 'weekday', '16:30:00', '17:30:00', 'Sân 6', 300000),
(7, 'weekday', '16:30:00', '17:30:00', 'Sân 7', 320000),
(8, 'weekday', '16:30:00', '17:30:00', 'Sân 11', 1500000),
(9, 'weekday', '17:30:00', '19:30:00', 'Sân 5', 350000),
(10, 'weekday', '17:30:00', '19:30:00', 'Sân 6', 370000),
(11, 'weekday', '17:30:00', '19:30:00', 'Sân 7', 400000),
(12, 'weekday', '17:30:00', '19:30:00', 'Sân 11', 1500000),
(13, 'weekday', '19:30:00', '20:30:00', 'Sân 5', 270000),
(14, 'weekday', '19:30:00', '20:30:00', 'Sân 6', 370000),
(15, 'weekday', '19:30:00', '20:30:00', 'Sân 7', 320000),
(16, 'weekday', '19:30:00', '20:30:00', 'Sân 11', 1500000),
(17, 'weekday', '20:30:00', '22:30:00', 'Sân 5', 270000),
(18, 'weekday', '20:30:00', '22:30:00', 'Sân 6', 300000),
(19, 'weekday', '20:30:00', '22:30:00', 'Sân 7', 320000),
(20, 'weekday', '20:30:00', '22:30:00', 'Sân 11', 1100000),
(21, 'weekend', '05:30:00', '16:30:00', 'Sân 5', 200000),
(22, 'weekend', '05:30:00', '16:30:00', 'Sân 6', 240000),
(23, 'weekend', '05:30:00', '16:30:00', 'Sân 7', 250000),
(24, 'weekend', '05:30:00', '16:30:00', 'Sân 11', 1300000),
(25, 'weekend', '16:30:00', '17:30:00', 'Sân 5', 270000),
(26, 'weekend', '16:30:00', '17:30:00', 'Sân 6', 370000),
(27, 'weekend', '16:30:00', '17:30:00', 'Sân 7', 400000),
(28, 'weekend', '16:30:00', '17:30:00', 'Sân 11', 1600000),
(29, 'weekend', '17:30:00', '19:30:00', 'Sân 5', 350000),
(30, 'weekend', '17:30:00', '19:30:00', 'Sân 6', 370000),
(31, 'weekend', '17:30:00', '19:30:00', 'Sân 7', 400000),
(32, 'weekend', '17:30:00', '19:30:00', 'Sân 11', 1600000),
(33, 'weekend', '19:30:00', '20:30:00', 'Sân 5', 270000),
(34, 'weekend', '19:30:00', '20:30:00', 'Sân 6', 300000),
(35, 'weekend', '19:30:00', '20:30:00', 'Sân 7', 320000),
(36, 'weekend', '19:30:00', '20:30:00', 'Sân 11', 1600000),
(37, 'weekend', '20:30:00', '22:30:00', 'Sân 5', 270000),
(38, 'weekend', '20:30:00', '22:30:00', 'Sân 6', 300000),
(39, 'weekend', '20:30:00', '22:30:00', 'Sân 7', 320000),
(40, 'weekend', '20:30:00', '22:30:00', 'Sân 11', 1300000);

-- --------------------------------------------------------

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
CREATE TABLE `promotions` (
  `id` int(11) NOT NULL,
  `title` varchar(150) NOT NULL,
  `code` varchar(50) DEFAULT NULL,
  `discount_type` enum('percentage','fixed_amount') NOT NULL DEFAULT 'percentage',
  `discount_value` decimal(10,0) NOT NULL,
  `min_order_amount` decimal(10,0) DEFAULT 0,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `promotions`
--

INSERT INTO `promotions` (`id`, `title`, `code`, `discount_type`, `discount_value`, `min_order_amount`, `start_date`, `end_date`, `is_active`, `created_at`) VALUES
(1, 'Chào mừng thành viên mới 2026', 'CHAOSAN2026', 'percentage', 10, 200000, '2026-01-01', '2026-12-31', 1, '2026-10-08 08:41:58');

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `booking_id` int(11) NOT NULL,
  `pitch_id` int(11) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `customer_phone` varchar(15) NOT NULL,
  `rating` tinyint(4) NOT NULL CHECK (`rating` >= 1 and `rating` <= 5),
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
CREATE TABLE `services` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT 'drink',
  `price` decimal(10,0) NOT NULL,
  `unit` varchar(20) NOT NULL,
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `name`, `category`, `price`, `unit`, `is_active`, `created_at`) VALUES
(1, 'Nước khoáng Aquafina 500ml', 'drink', 10000, 'chai', 1, '2026-10-08 08:41:58'),
(3, 'Nước tăng lực Redbull (Bò húc)', 'drink', 20000, 'lon', 1, '2026-10-08 08:41:58'),
(4, 'Thuê bộ áo bib phân đội (7 áo)', 'rental', 30000, 'bộ', 1, '2026-10-08 08:41:58'),
(6, 'Nước điện giải Revive Chanh muối', 'drink', 10000, 'chai', 1, '2026-10-09 07:16:28');

-- --------------------------------------------------------

--
-- Table structure for table `time_slots`
--

DROP TABLE IF EXISTS `time_slots`;
CREATE TABLE `time_slots` (
  `id` int(11) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `price_multiplier` decimal(3,2) DEFAULT 1.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `time_slots`
--

INSERT INTO `time_slots` (`id`, `start_time`, `end_time`, `price_multiplier`) VALUES
(1, '06:00:00', '07:30:00', 1.00),
(2, '07:30:00', '09:00:00', 1.00),
(3, '16:00:00', '17:30:00', 1.20),
(4, '17:30:00', '19:00:00', 1.40),
(5, '19:00:00', '20:30:00', 1.40),
(6, '20:30:00', '22:00:00', 1.20);

-- --------------------------------------------------------

--
-- Table structure for table `time_slot_rules`
--

DROP TABLE IF EXISTS `time_slot_rules`;
CREATE TABLE `time_slot_rules` (
  `id` int(11) NOT NULL,
  `shift_name` varchar(50) NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `price_multiplier` decimal(3,2) DEFAULT 1.00,
  `weekend_multiplier` decimal(3,2) DEFAULT 1.20,
  `note` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `time_slot_rules`
--

INSERT INTO `time_slot_rules` (`id`, `shift_name`, `start_time`, `end_time`, `price_multiplier`, `weekend_multiplier`, `note`) VALUES
(1, 'Ca Sáng', '05:00:00', '11:00:00', 1.00, 1.50, 'Mát mẻ, thích hợp HSSV và người lớn tuổi'),
(2, 'Ca Chiều', '14:00:00', '18:00:00', 1.50, 2.00, 'Thời tiết mát dần từ 16h'),
(3, 'Ca Tối (Giờ Vàng)', '18:00:00', '22:00:00', 2.20, 2.70, 'Khung giờ cao điểm nhất trong ngày'),
(4, 'Ca Đêm Muộn', '22:00:00', '23:00:00', 1.50, 1.70, 'Dành cho các kèo đấu muộn');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('admin','staff') NOT NULL DEFAULT 'staff',
  `is_active` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `shift_assigned` varchar(255) DEFAULT 'Vắng mặt / Nghỉ'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `full_name`, `role`, `is_active`, `created_at`, `shift_assigned`) VALUES
(1, 'admin', '$2a$10$uGa9B4LsTfHS2NHi6IK62e46jhUPxKCgLQyA.PJ/8fivqyHzsliiK', 'Chủ Sân Quản Lý', 'admin', 1, '2026-10-08 08:41:58', 'Ca Sáng (05:00 - 11:00)'),
(2, 'staff1', '$2a$10$uGa9B4LsTfHS2NHi6IK62e46jhUPxKCgLQyA.PJ/8fivqyHzsliiK', 'Nguyễn Văn Trực Ban', 'staff', 1, '2026-10-08 08:41:58', 'Ca Sáng (05:00 - 11:00), Ca Chiều (14:00 - 18:00), Ca Tối - Giờ Vàng (18:00 - 22:00), Ca Đêm Muộn (22:00 - 23:00)'),
(3, 'huy', '$2b$10$SxIY5Im0NO6WA.14MUFqgORWSnNFO7iag7Cp29/toxMohHo5FN5Pq', 'huy', 'staff', 1, '2026-10-09 05:13:13', 'Ca Sáng (05:00 - 11:00), Ca Chiều (14:00 - 18:00), Ca Tối - Giờ Vàng (18:00 - 22:00), Ca Đêm Muộn (22:00 - 23:00)');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`),
  ADD KEY `pitch_id` (`pitch_id`),
  ADD KEY `promotion_id` (`promotion_id`),
  ADD KEY `created_by_user_id` (`created_by_user_id`);

--
-- Indexes for table `booking_services`
--
ALTER TABLE `booking_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `booking_id` (`booking_id`),
  ADD KEY `service_id` (`service_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `phone` (`phone`);

--
-- Indexes for table `match_requests`
--
ALTER TABLE `match_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_id` (`booking_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pitches`
--
ALTER TABLE `pitches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pitch_images`
--
ALTER TABLE `pitch_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pitch_id` (`pitch_id`);

--
-- Indexes for table `pitch_reviews`
--
ALTER TABLE `pitch_reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `pitch_id` (`pitch_id`);

--
-- Indexes for table `pricing_rules`
--
ALTER TABLE `pricing_rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `promotions`
--
ALTER TABLE `promotions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `booking_id` (`booking_id`),
  ADD KEY `pitch_id` (`pitch_id`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `time_slots`
--
ALTER TABLE `time_slots`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `time_slot_rules`
--
ALTER TABLE `time_slot_rules`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT for table `booking_services`
--
ALTER TABLE `booking_services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `match_requests`
--
ALTER TABLE `match_requests`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `pitches`
--
ALTER TABLE `pitches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `pitch_images`
--
ALTER TABLE `pitch_images`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `pitch_reviews`
--
ALTER TABLE `pitch_reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `pricing_rules`
--
ALTER TABLE `pricing_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT for table `promotions`
--
ALTER TABLE `promotions`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `time_slots`
--
ALTER TABLE `time_slots`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `time_slot_rules`
--
ALTER TABLE `time_slot_rules`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`pitch_id`) REFERENCES `pitches` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `booking_services`
--
ALTER TABLE `booking_services`
  ADD CONSTRAINT `booking_services_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `booking_services_ibfk_2` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `match_requests`
--
ALTER TABLE `match_requests`
  ADD CONSTRAINT `match_requests_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pitch_images`
--
ALTER TABLE `pitch_images`
  ADD CONSTRAINT `pitch_images_ibfk_1` FOREIGN KEY (`pitch_id`) REFERENCES `pitches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pitch_reviews`
--
ALTER TABLE `pitch_reviews`
  ADD CONSTRAINT `pitch_reviews_ibfk_1` FOREIGN KEY (`pitch_id`) REFERENCES `pitches` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`pitch_id`) REFERENCES `pitches` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
