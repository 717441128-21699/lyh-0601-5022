-- 残障人士辅助器具适配与康复训练管理平台数据库
-- 创建数据库
CREATE DATABASE IF NOT EXISTS rehab_platform DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE rehab_platform;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    real_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    role ENUM('disabled', 'adapter', 'therapist', 'finance', 'admin') NOT NULL,
    avatar VARCHAR(255),
    status TINYINT DEFAULT 1 COMMENT '1-正常 0-禁用',
    address VARCHAR(255),
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_role (role),
    INDEX idx_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 残障人士扩展信息表
CREATE TABLE IF NOT EXISTS disabled_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    disability_type VARCHAR(50) NOT NULL COMMENT '残疾类型: 肢体残疾, 视力残疾, 听力残疾, 言语残疾, 智力残疾, 精神残疾',
    disability_level VARCHAR(20) COMMENT '残疾等级: 一级, 二级, 三级, 四级',
    height DECIMAL(5, 2),
    weight DECIMAL(5, 2),
    age INT,
    gender ENUM('male', 'female', 'other'),
    medical_history TEXT,
    daily_needs TEXT COMMENT '日常需求描述',
    living_environment TEXT COMMENT '居住环境描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_disability_type (disability_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 适配师扩展信息表
CREATE TABLE IF NOT EXISTS adapter_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    license_no VARCHAR(50) COMMENT '执业证号',
    specialty VARCHAR(100) COMMENT '专长领域',
    experience_years INT COMMENT '从业年限',
    work_area VARCHAR(255) COMMENT '工作区域',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 康复师扩展信息表
CREATE TABLE IF NOT EXISTS therapist_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    license_no VARCHAR(50) COMMENT '执业证号',
    specialty VARCHAR(100) COMMENT '专长领域',
    experience_years INT COMMENT '从业年限',
    work_address VARCHAR(255) COMMENT '工作地点',
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    work_days VARCHAR(20) DEFAULT '1,2,3,4,5' COMMENT '工作日: 1-7对应周一到周日',
    work_start_time TIME DEFAULT '09:00:00',
    work_end_time TIME DEFAULT '18:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 辅助器具表
CREATE TABLE IF NOT EXISTS assistive_devices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT '器具分类',
    sub_category VARCHAR(50) COMMENT '子分类',
    disability_types VARCHAR(255) NOT NULL COMMENT '适用残疾类型，逗号分隔',
    description TEXT,
    specifications TEXT COMMENT '规格参数JSON',
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    brand VARCHAR(50),
    stock INT DEFAULT 0,
    suitable_conditions TEXT COMMENT '适用条件',
    contraindications TEXT COMMENT '禁忌症',
    status TINYINT DEFAULT 1 COMMENT '1-上架 0-下架',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_disability_types (disability_types),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评估记录表
CREATE TABLE IF NOT EXISTS assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '残障人士用户ID',
    adapter_id INT COMMENT '适配师用户ID',
    assessment_type ENUM('online', 'home') DEFAULT 'online' COMMENT '评估类型: online-在线自评, home-上门评估',
    disability_type VARCHAR(50),
    disability_level VARCHAR(20),
    body_data TEXT COMMENT '身体数据JSON',
    daily_needs TEXT COMMENT '日常需求',
    medical_history TEXT,
    living_environment TEXT,
    evaluation_details TEXT COMMENT '评估详情',
    recommendation_result TEXT COMMENT '推荐结果JSON',
    status ENUM('pending', 'processing', 'completed', 'cancelled') DEFAULT 'pending',
    assessment_time DATETIME COMMENT '评估时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (adapter_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_adapter_id (adapter_id),
    INDEX idx_status (status),
    INDEX idx_assessment_type (assessment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 适配方案表
CREATE TABLE IF NOT EXISTS adaptation_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assessment_id INT NOT NULL,
    user_id INT NOT NULL,
    adapter_id INT NOT NULL,
    plan_name VARCHAR(100) NOT NULL,
    plan_description TEXT,
    devices TEXT COMMENT '推荐器具列表JSON',
    usage_instructions TEXT COMMENT '使用说明',
    precautions TEXT COMMENT '注意事项',
    estimated_effect TEXT COMMENT '预期效果',
    total_price DECIMAL(10, 2) DEFAULT 0,
    status ENUM('draft', 'confirmed', 'rejected', 'modified') DEFAULT 'draft',
    confirmed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (adapter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_assessment_id (assessment_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) UNIQUE NOT NULL,
    plan_id INT NOT NULL,
    user_id INT NOT NULL,
    adapter_id INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    actual_amount DECIMAL(10, 2) NOT NULL,
    order_status ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded') DEFAULT 'pending',
    payment_status ENUM('unpaid', 'paid', 'refunded') DEFAULT 'unpaid',
    delivery_address VARCHAR(255),
    contact_name VARCHAR(50),
    contact_phone VARCHAR(20),
    remark TEXT,
    order_date DATE,
    confirmed_at DATETIME,
    delivered_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES adaptation_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (adapter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order_no (order_no),
    INDEX idx_user_id (user_id),
    INDEX idx_order_status (order_status),
    INDEX idx_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 订单明细表
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    device_id INT NOT NULL,
    device_name VARCHAR(100),
    quantity INT DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES assistive_devices(id),
    INDEX idx_order_id (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 训练计划表
CREATE TABLE IF NOT EXISTS training_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '残障人士用户ID',
    therapist_id INT NOT NULL COMMENT '康复师用户ID',
    plan_name VARCHAR(100) NOT NULL,
    plan_description TEXT,
    training_type VARCHAR(50) COMMENT '训练类型',
    initial_intensity INT DEFAULT 1 COMMENT '初始强度 1-10',
    initial_frequency INT DEFAULT 3 COMMENT '初始频率: 每周次数',
    current_intensity INT DEFAULT 1 COMMENT '当前强度',
    current_frequency INT DEFAULT 3 COMMENT '当前频率',
    total_duration INT COMMENT '总周期(周)',
    start_date DATE,
    end_date DATE,
    status ENUM('active', 'completed', 'suspended', 'cancelled') DEFAULT 'active',
    goals TEXT COMMENT '训练目标',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_therapist_id (therapist_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 训练记录表
CREATE TABLE IF NOT EXISTS training_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    user_id INT NOT NULL,
    therapist_id INT NOT NULL,
    training_date DATE NOT NULL,
    training_duration INT COMMENT '训练时长(分钟)',
    completion_rate DECIMAL(5, 2) COMMENT '完成度百分比',
    intensity_level INT COMMENT '本次训练强度',
    exercises TEXT COMMENT '训练项目JSON',
    performance_data TEXT COMMENT '表现数据JSON',
    notes TEXT COMMENT '备注',
    feedback TEXT COMMENT '用户反馈',
    next_intensity INT COMMENT '调整后下次强度',
    next_frequency INT COMMENT '调整后下次频率',
    adjustment_reason TEXT COMMENT '调整原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES training_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_plan_id (plan_id),
    INDEX idx_user_id (user_id),
    INDEX idx_training_date (training_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 预约表
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT '残障人士用户ID',
    therapist_id INT NOT NULL COMMENT '康复师用户ID',
    appointment_type ENUM('evaluation', 'training', 'consultation') DEFAULT 'training',
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration INT COMMENT '时长(分钟)',
    status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'no_show') DEFAULT 'pending',
    location VARCHAR(255) COMMENT '地点',
    notes TEXT,
    distance DECIMAL(10, 2) COMMENT '距离(公里)',
    reminder_sent TINYINT DEFAULT 0 COMMENT '是否已发送提醒',
    confirmed_at DATETIME,
    cancelled_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (therapist_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_therapist_id (therapist_id),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 财务记录表
CREATE TABLE IF NOT EXISTS financial_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    record_type ENUM('order', 'training', 'refund', 'other') NOT NULL,
    related_id INT COMMENT '关联ID(订单ID或训练记录ID)',
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_no VARCHAR(100),
    record_date DATE NOT NULL,
    description TEXT,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_record_type (record_type),
    INDEX idx_record_date (record_date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 月度运营报表
CREATE TABLE IF NOT EXISTS monthly_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    report_month VARCHAR(7) NOT NULL COMMENT '格式: YYYY-MM',
    total_orders INT DEFAULT 0 COMMENT '总订单数',
    order_revenue DECIMAL(12, 2) DEFAULT 0 COMMENT '订单收入',
    total_trainings INT DEFAULT 0 COMMENT '总训练次数',
    training_revenue DECIMAL(12, 2) DEFAULT 0 COMMENT '训练收入',
    total_revenue DECIMAL(12, 2) DEFAULT 0 COMMENT '总收入',
    new_users INT DEFAULT 0 COMMENT '新增用户数',
    active_users INT DEFAULT 0 COMMENT '活跃用户数',
    compared_data TEXT COMMENT '对比数据JSON',
    status ENUM('draft', 'published') DEFAULT 'draft',
    generated_at DATETIME,
    pushed TINYINT DEFAULT 0 COMMENT '是否已推送',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_report_month (report_month),
    INDEX idx_report_month (report_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 消息通知表
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type VARCHAR(50) NOT NULL COMMENT '消息类型',
    title VARCHAR(200) NOT NULL,
    content TEXT,
    related_type VARCHAR(50) COMMENT '关联业务类型',
    related_id INT COMMENT '关联业务ID',
    is_read TINYINT DEFAULT 0 COMMENT '是否已读',
    read_at DATETIME,
    push_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入初始管理员账号 (密码: admin123，实际使用时需要bcrypt加密)
INSERT INTO users (username, password, real_name, phone, email, role, status) VALUES
('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '系统管理员', '13800138000', 'admin@rehab.com', 'admin', 1);

-- 插入初始测试账号
INSERT INTO users (username, password, real_name, phone, email, role, status, address, latitude, longitude) VALUES
('disabled01', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '张三', '13900139001', 'zhangsan@test.com', 'disabled', 1, '北京市朝阳区XX街道XX号', 39.9042000, 116.4074000),
('adapter01', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '李适配', '13900139002', 'liadapter@test.com', 'adapter', 1, '北京市海淀区XX路XX号', 39.9142000, 116.4174000),
('therapist01', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '王康复', '13900139003', 'wangtherapist@test.com', 'therapist', 1, '北京市西城区XX街XX号', 39.9242000, 116.3974000),
('finance01', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '赵财务', '13900139004', 'zhaofinance@test.com', 'finance', 1, '北京市东城区XX胡同XX号', 39.9342000, 116.4274000);

-- 插入残障人士档案
INSERT INTO disabled_profiles (user_id, disability_type, disability_level, height, weight, age, gender, daily_needs, living_environment) VALUES
(2, '肢体残疾', '二级', 175.00, 70.00, 35, 'male', '需要轮椅代步，日常生活需要辅助器具帮助', '住在老旧小区，无电梯，室内空间狭小');

-- 插入适配师档案
INSERT INTO adapter_profiles (user_id, license_no, specialty, experience_years, work_area) VALUES
(3, 'ADP202001001', '肢体残疾辅助器具适配', 8, '北京市全区');

-- 插入康复师档案
INSERT INTO therapist_profiles (user_id, license_no, specialty, experience_years, work_address, latitude, longitude) VALUES
(4, 'THP201901001', '运动康复,物理治疗', 6, '北京市西城区康复中心', 39.9242000, 116.3974000);

-- 插入辅助器具示例数据
INSERT INTO assistive_devices (name, category, sub_category, disability_types, description, specifications, price, brand, stock, suitable_conditions) VALUES
('手动轮椅', '移动辅助', '轮椅', '肢体残疾', '标准手动轮椅，轻便折叠，适合室内外使用', '{"材质":"铝合金","最大承重":"100kg","轮径":"24寸","重量":"12kg"}', 1299.00, '康扬', 50, '下肢行动不便者'),
('电动轮椅', '移动辅助', '轮椅', '肢体残疾', '智能电动轮椅，长续航，操作简单', '{"材质":"碳钢","最大承重":"120kg","续航":"30km","速度":"6km/h"}', 3999.00, '九圆', 30, '上肢功能正常的下肢残疾者'),
('助行器', '移动辅助', '助行器', '肢体残疾', '四脚助行器，可调节高度，防滑设计', '{"材质":"铝合金","高度范围":"75-95cm","承重":"150kg","重量":"2.5kg"}', 299.00, '鱼跃', 100, '下肢力量不足，需要辅助行走者'),
('盲杖', '视力辅助', '盲杖', '视力残疾', '可折叠盲杖，反光材质，手柄防滑', '{"材质":"铝合金","长度":"120cm","节数":"4节","重量":"0.3kg"}', 89.00, '汇海', 200, '视力障碍者'),
('助听器', '听力辅助', '助听器', '听力残疾', '数字助听器，降噪功能，佩戴舒适', '{"类型":"耳背式","增益":"50dB","电池续航":"80小时","防水等级":"IP54"}', 1599.00, '西门子', 80, '中度到重度听力损失者'),
('防褥疮气垫', '护理辅助', '防褥疮', '肢体残疾', '交替充气气垫，预防褥疮，静音气泵', '{"尺寸":"190×90×10cm","材质":"PVC","气室数":"20条","噪音":"<30dB"}', 599.00, '三马', 60, '长期卧床者'),
('坐便椅', '护理辅助', '坐便椅', '肢体残疾', '可调节坐便椅，带扶手，防滑脚垫', '{"材质":"钢管喷塑","高度范围":"45-60cm","承重":"150kg","座板":"塑料"}', 399.00, '佛山东方', 70, '行动不便，如厕困难者'),
('矫形器', '康复辅助', '矫形器', '肢体残疾', '定制踝足矫形器，矫正足下垂', '{"材质":"聚丙烯","适用":"踝足畸形","佩戴方式":"穿戴式","特点":"轻量化"}', 899.00, '科林', 40, '踝足功能障碍者');
