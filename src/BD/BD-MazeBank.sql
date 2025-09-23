-- ============================================
-- SISTEMA BANCARIO - BASE DE DATOS COMPLETA
-- ============================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS MazeBank;
USE MazeBank;

-- ============================================
-- CREAR TABLAS
-- ============================================

-- Tabla de Roles
CREATE TABLE roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Usuarios
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    ine_approval BOOLEAN DEFAULT FALSE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    FOREIGN KEY (role_id) REFERENCES roles(role_id)
);

-- Tabla de Cuentas Bancarias
CREATE TABLE bank_accounts (
    account_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    account_type ENUM('savings', 'checking', 'business') NOT NULL,
    balance DECIMAL(15,2) DEFAULT 0.00,
    account_number VARCHAR(20) NOT NULL UNIQUE,
    opening_date DATE NOT NULL,
    status ENUM('active', 'inactive', 'frozen', 'closed') DEFAULT 'active',
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Tabla de Tipos de Tarjeta
CREATE TABLE card_types (
    type_id INT AUTO_INCREMENT PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    interest_rate DECIMAL(5,2),
    annual_fee DECIMAL(10,2),
    credit_limit_max DECIMAL(15,2)
);

-- Tabla de Tarjetas
CREATE TABLE cards (
    card_id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    card_type_id INT NOT NULL,
    card_number VARCHAR(16) NOT NULL UNIQUE,
    expiration_date DATE NOT NULL,
    cvv VARCHAR(4) NOT NULL,
    is_virtual BOOLEAN DEFAULT FALSE,
    credit_limit DECIMAL(15,2),
    status ENUM('active', 'inactive', 'blocked', 'expired') DEFAULT 'active',
    FOREIGN KEY (account_id) REFERENCES bank_accounts(account_id),
    FOREIGN KEY (card_type_id) REFERENCES card_types(type_id)
);

-- Tabla de Préstamos
CREATE TABLE loans (
    loan_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,2) NOT NULL,
    term_months INT NOT NULL,
    application_date DATE NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'active', 'completed', 'defaulted') DEFAULT 'pending',
    pending_balance DECIMAL(15,2),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Tabla de Beneficiarios
CREATE TABLE beneficiaries (
    beneficiary_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    bank VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Tabla de Transacciones
CREATE TABLE transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    source_account_id INT,
    destination_account_id INT,
    type ENUM('deposit', 'withdrawal', 'transfer', 'payment', 'loan_payment', 'card_payment') NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    FOREIGN KEY (source_account_id) REFERENCES bank_accounts(account_id),
    FOREIGN KEY (destination_account_id) REFERENCES bank_accounts(account_id)
);

-- Tabla de Tokens (para autenticación/sesiones)
CREATE TABLE tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    operation_type ENUM('login', 'password_reset', 'email_verification', '2fa') NOT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiration_date TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- ============================================
-- INSERTAR DATOS DE PRUEBA
-- ============================================

-- Insertar Roles
INSERT INTO roles (role_name, description) VALUES
('cliente', 'Usuario final del sistema bancario'),
('ejecutivo', 'Ejecutivo de cuenta con permisos intermedios'),
('gerente', 'Gerente con permisos administrativos completos');

-- Insertar Tipos de Tarjeta
INSERT INTO card_types (type_name, description, interest_rate, annual_fee, credit_limit_max) VALUES
('credito', 'Tarjeta de crédito estándar', 24.99, 120.00, 50000.00),
('debito', 'Tarjeta de débito vinculada a cuenta', 0.00, 0.00, NULL),
('prestamos', 'Tarjeta especializada para préstamos', 18.50, 80.00, 100000.00),
('empresarial', 'Tarjeta corporativa para empresas', 19.99, 200.00, 200000.00),
('oro', 'Tarjeta premium con beneficios exclusivos', 22.99, 300.00, 100000.00);

-- Insertar Usuarios
INSERT INTO users (name, email, phone, address, password, role_id, ine_approval) VALUES
-- Clientes
('Juan Pérez González', 'juan.perez@email.com', '555-0101', 'Av. Principal 123, Ciudad de México', SHA2('password123', 256), 1, TRUE),
('María Carmen López', 'maria.lopez@email.com', '555-0102', 'Calle Secundaria 456, Guadalajara', SHA2('password456', 256), 1, TRUE),
('Carlos Roberto Díaz', 'carlos.diaz@email.com', '555-0103', 'Boulevard Norte 789, Monterrey', SHA2('password789', 256), 1, FALSE),
('Ana Isabel Martínez', 'ana.martinez@email.com', '555-0104', 'Av. Sur 321, Puebla', SHA2('passwordabc', 256), 1, TRUE),
-- Ejecutivos
('Luis Fernando Ruiz', 'luis.ruiz@banco.com', '555-0201', 'Oficina Central, CDMX', SHA2('exec123', 256), 2, TRUE),
('Patricia Morales Silva', 'patricia.morales@banco.com', '555-0202', 'Sucursal Guadalajara', SHA2('exec456', 256), 2, TRUE),
-- Gerentes
('Roberto Carlos Vega', 'roberto.vega@banco.com', '555-0301', 'Dirección General, CDMX', SHA2('manager123', 256), 3, TRUE),
('Claudia Elena Torres', 'claudia.torres@banco.com', '555-0302', 'Gerencia Regional Norte', SHA2('manager456', 256), 3, TRUE);

-- Insertar Cuentas Bancarias
INSERT INTO bank_accounts (user_id, account_type, balance, account_number, opening_date) VALUES
(1, 'checking', 15750.50, '1001234567890123', '2023-01-15'),
(1, 'savings', 45000.00, '2001234567890123', '2023-02-01'),
(2, 'checking', 8950.75, '1001234567890124', '2023-03-10'),
(2, 'savings', 32500.25, '2001234567890124', '2023-03-15'),
(3, 'business', 125000.00, '3001234567890125', '2023-04-05'),
(3, 'checking', 25750.80, '1001234567890125', '2023-04-10'),
(4, 'savings', 18200.45, '2001234567890126', '2023-05-20'),
(4, 'checking', 6750.30, '1001234567890127', '2023-05-25');

-- Insertar Tarjetas
INSERT INTO cards (account_id, card_type_id, card_number, expiration_date, cvv, credit_limit) VALUES
-- Tarjetas de débito
(1, 2, '4000123456781234', '2027-12-31', '123', NULL),
(3, 2, '4000123456782345', '2027-11-30', '234', NULL),
(6, 2, '4000123456783456', '2028-01-31', '345', NULL),
(7, 2, '4000123456784567', '2027-10-31', '456', NULL),
-- Tarjetas de crédito
(2, 1, '5000123456785678', '2028-03-31', '567', 25000.00),
(4, 1, '5000123456786789', '2028-02-28', '678', 30000.00),
(8, 1, '5000123456787890', '2027-12-31', '789', 15000.00),
-- Tarjeta empresarial
(5, 4, '6000123456788901', '2029-06-30', '890', 150000.00),
-- Tarjeta oro
(2, 5, '7000123456789012', '2028-08-31', '901', 75000.00);

-- Insertar Préstamos
INSERT INTO loans (user_id, amount, interest_rate, term_months, application_date, status, pending_balance) VALUES
(1, 150000.00, 12.50, 60, '2024-01-15', 'active', 135000.00),
(2, 80000.00, 15.75, 36, '2024-02-20', 'active', 65000.00),
(3, 500000.00, 10.25, 120, '2024-03-10', 'approved', 500000.00),
(4, 25000.00, 18.50, 24, '2024-04-05', 'active', 18750.00),
(1, 75000.00, 14.00, 48, '2024-08-15', 'pending', NULL);

-- Insertar Beneficiarios
INSERT INTO beneficiaries (user_id, name, account_number, bank) VALUES
(1, 'María del Carmen Pérez', '4001234567890001', 'Banco Nacional'),
(1, 'Pedro José González', '5001234567890002', 'Banco del Sur'),
(2, 'Roberto López Martínez', '4001234567890003', 'Banco Central'),
(2, 'Sofía Carmen Ruiz', '6001234567890004', 'Banco Internacional'),
(3, 'Empresa ABC S.A. de C.V.', '7001234567890005', 'Banco Empresarial'),
(4, 'Jorge Martínez Silva', '4001234567890006', 'Banco Nacional');

-- Insertar Transacciones
INSERT INTO transactions (source_account_id, destination_account_id, type, amount, description) VALUES
-- Depósitos
(NULL, 1, 'deposit', 5000.00, 'Depósito en efectivo'),
(NULL, 3, 'deposit', 2500.00, 'Depósito por transferencia externa'),
(NULL, 6, 'deposit', 10000.00, 'Depósito de nómina'),

-- Retiros
(1, NULL, 'withdrawal', 1500.00, 'Retiro en ATM'),
(3, NULL, 'withdrawal', 800.00, 'Retiro en sucursal'),
(7, NULL, 'withdrawal', 500.00, 'Retiro en ATM'),

-- Transferencias entre cuentas
(1, 2, 'transfer', 3000.00, 'Transferencia a cuenta de ahorros'),
(5, 6, 'transfer', 25000.00, 'Transferencia empresarial'),
(2, 4, 'transfer', 5000.00, 'Transferencia entre usuarios'),

-- Pagos con tarjeta
(1, NULL, 'card_payment', 250.00, 'Compra en supermercado'),
(3, NULL, 'card_payment', 1200.00, 'Pago en restaurante'),
(6, NULL, 'card_payment', 75.00, 'Compra en gasolinera'),

-- Pagos de préstamos
(1, NULL, 'loan_payment', 3500.00, 'Pago mensual préstamo hipotecario'),
(3, NULL, 'loan_payment', 2200.00, 'Pago préstamo personal'),

-- Pagos diversos
(2, NULL, 'payment', 450.00, 'Pago de servicios públicos'),
(4, NULL, 'payment', 890.00, 'Pago de tarjeta de crédito');

-- Insertar Tokens de ejemplo
INSERT INTO tokens (user_id, token, operation_type, expiration_date) VALUES
(1, 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', 'login', DATE_ADD(NOW(), INTERVAL 24 HOUR)),
(2, 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7', '2fa', DATE_ADD(NOW(), INTERVAL 10 MINUTE)),
(3, 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8', 'password_reset', DATE_ADD(NOW(), INTERVAL 1 HOUR));

-- ============================================
-- CONSULTAS DE VERIFICACIÓN
-- ============================================

-- Verificar estructura y datos
SELECT 'ROLES' as tabla, COUNT(*) as registros FROM roles
UNION ALL
SELECT 'USUARIOS', COUNT(*) FROM users
UNION ALL
SELECT 'TIPOS_TARJETA', COUNT(*) FROM card_types  
UNION ALL
SELECT 'CUENTAS', COUNT(*) FROM bank_accounts
UNION ALL
SELECT 'TARJETAS', COUNT(*) FROM cards
UNION ALL
SELECT 'PRÉSTAMOS', COUNT(*) FROM loans
UNION ALL
SELECT 'BENEFICIARIOS', COUNT(*) FROM beneficiaries
UNION ALL
SELECT 'TRANSACCIONES', COUNT(*) FROM transactions
UNION ALL
SELECT 'TOKENS', COUNT(*) FROM tokens;

-- Vista resumen por usuario
SELECT 
    u.name as usuario,
    r.role_name as rol,
    u.ine_approval as ine_aprobado,
    COUNT(DISTINCT ba.account_id) as cuentas,
    COUNT(DISTINCT c.card_id) as tarjetas,
    COUNT(DISTINCT l.loan_id) as prestamos,
    SUM(ba.balance) as balance_total
FROM users u
LEFT JOIN roles r ON u.role_id = r.role_id
LEFT JOIN bank_accounts ba ON u.user_id = ba.user_id
LEFT JOIN cards c ON ba.account_id = c.account_id
LEFT JOIN loans l ON u.user_id = l.user_id
WHERE r.role_name = 'cliente'
GROUP BY u.user_id, u.name, r.role_name, u.ine_approval
ORDER BY balance_total DESC;

-- Consulta adicional: Verificar estados de aprobación INE
SELECT 
    r.role_name as rol,
    SUM(CASE WHEN u.ine_approval = TRUE THEN 1 ELSE 0 END) as ine_aprobados,
    SUM(CASE WHEN u.ine_approval = FALSE THEN 1 ELSE 0 END) as ine_pendientes,
    COUNT(*) as total_usuarios
FROM users u
JOIN roles r ON u.role_id = r.role_id
GROUP BY r.role_name
ORDER BY r.role_id;

-- ============================================
-- CONSULTAS DE VERIFICACIÓN DE COHERENCIA
-- ============================================

-- 1. Verificar que todas las cuentas tienen al menos una transacción
SELECT 
    'Cuentas sin transacciones' as verificacion,
    COUNT(*) as total_encontrados
FROM bank_accounts ba
LEFT JOIN transactions t ON (ba.account_id = t.source_account_id OR ba.account_id = t.destination_account_id)
WHERE t.transaction_id IS NULL;

-- 2. Verificar balances negativos en cuentas
SELECT 
    'Cuentas con balance negativo' as verificacion,
    ba.account_number,
    ba.balance,
    u.name as propietario,
    ba.account_type
FROM bank_accounts ba
JOIN users u ON ba.user_id = u.user_id
WHERE ba.balance < 0;

-- 3. Verificar tarjetas con fecha de expiración vencida
SELECT 
    'Tarjetas vencidas con status activo' as verificacion,
    c.card_number,
    c.expiration_date,
    u.name as propietario,
    ct.type_name,
    c.status
FROM cards c
JOIN bank_accounts ba ON c.account_id = ba.account_id
JOIN users u ON ba.user_id = u.user_id
JOIN card_types ct ON c.card_type_id = ct.type_id
WHERE c.expiration_date < CURDATE() AND c.status = 'active';

-- 4. Verificar préstamos con balance pendiente mayor al monto original
SELECT 
    'Préstamos con balance inconsistente' as verificacion,
    l.loan_id,
    u.name as cliente,
    l.amount as monto_original,
    l.pending_balance as balance_pendiente,
    l.status
FROM loans l
JOIN users u ON l.user_id = u.user_id
WHERE l.pending_balance > l.amount;

-- 5. Verificar usuarios sin cuentas bancarias (solo clientes)
SELECT 
    'Clientes sin cuentas bancarias' as verificacion,
    u.name,
    u.email,
    u.ine_approval,
    u.status
FROM users u
JOIN roles r ON u.role_id = r.role_id
LEFT JOIN bank_accounts ba ON u.user_id = ba.user_id
WHERE r.role_name = 'cliente' AND ba.account_id IS NULL;

-- 6. Verificar cuentas inactivas con transacciones recientes
SELECT 
    'Cuentas inactivas con transacciones recientes' as verificacion,
    ba.account_number,
    ba.status as estado_cuenta,
    u.name as propietario,
    COUNT(t.transaction_id) as transacciones_recientes
FROM bank_accounts ba
JOIN users u ON ba.user_id = u.user_id
LEFT JOIN transactions t ON (ba.account_id = t.source_account_id OR ba.account_id = t.destination_account_id)
WHERE ba.status IN ('inactive', 'frozen', 'closed') 
AND t.date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY ba.account_id, ba.account_number, ba.status, u.name;

-- 7. Verificar límites de crédito excedidos en tarjetas de débito
SELECT 
    'Tarjetas de débito con límite de crédito' as verificacion,
    c.card_number,
    ct.type_name,
    c.credit_limit,
    u.name as propietario
FROM cards c
JOIN card_types ct ON c.card_type_id = ct.type_id
JOIN bank_accounts ba ON c.account_id = ba.account_id
JOIN users u ON ba.user_id = u.user_id
WHERE ct.type_name = 'debito' AND c.credit_limit IS NOT NULL AND c.credit_limit > 0;

-- 8. Verificar usuarios con INE no aprobado pero con préstamos activos
SELECT 
    'Usuarios sin INE aprobado con préstamos activos' as verificacion,
    u.name,
    u.ine_approval,
    COUNT(l.loan_id) as prestamos_activos,
    SUM(l.amount) as monto_total_prestamos
FROM users u
JOIN loans l ON u.user_id = l.user_id
WHERE u.ine_approval = FALSE AND l.status IN ('active', 'approved')
GROUP BY u.user_id, u.name, u.ine_approval;

-- 9. Verificar transacciones con montos en cero o negativos
SELECT 
    'Transacciones con montos inválidos' as verificacion,
    t.transaction_id,
    t.type,
    t.amount,
    t.description,
    t.date
FROM transactions t
WHERE t.amount <= 0;

-- 10. Verificar beneficiarios con números de cuenta duplicados
SELECT 
    'Beneficiarios con cuentas duplicadas' as verificacion,
    b.account_number,
    COUNT(*) as veces_registrado,
    GROUP_CONCAT(u.name SEPARATOR ', ') as propietarios
FROM beneficiaries b
JOIN users u ON b.user_id = u.user_id
GROUP BY b.account_number
HAVING COUNT(*) > 1;

-- 11. Verificar tokens expirados que aún no están marcados como usados
SELECT 
    'Tokens expirados sin usar' as verificacion,
    COUNT(*) as tokens_expirados,
    t.operation_type
FROM tokens t
WHERE t.expiration_date < NOW() AND t.used = FALSE
GROUP BY t.operation_type;

-- 12. Verificar consistencia de tipos de cuenta y tarjetas
SELECT 
    'Cuentas de ahorro con tarjetas empresariales' as verificacion,
    ba.account_number,
    ba.account_type,
    ct.type_name as tipo_tarjeta,
    u.name as propietario
FROM bank_accounts ba
JOIN cards c ON ba.account_id = c.account_id
JOIN card_types ct ON c.card_type_id = ct.type_id
JOIN users u ON ba.user_id = u.user_id
WHERE ba.account_type = 'savings' AND ct.type_name = 'empresarial';

-- 13. Verificar usuarios empleados con cuentas de cliente
SELECT 
    'Empleados con múltiples cuentas como clientes' as verificacion,
    u.name,
    r.role_name,
    COUNT(ba.account_id) as total_cuentas
FROM users u
JOIN roles r ON u.role_id = r.role_id
JOIN bank_accounts ba ON u.user_id = ba.user_id
WHERE r.role_name IN ('ejecutivo', 'gerente')
GROUP BY u.user_id, u.name, r.role_name
HAVING COUNT(ba.account_id) > 2;

-- 14. Resumen general de coherencia de datos
SELECT 'RESUMEN DE VERIFICACIONES' as titulo, '' as detalle, '' as cantidad
UNION ALL
SELECT '========================', '', ''
UNION ALL
SELECT 'Total usuarios', '', COUNT(*) FROM users
UNION ALL
SELECT 'Usuarios con INE aprobado', '', (SELECT COUNT(*) FROM users WHERE ine_approval = TRUE)
UNION ALL
SELECT 'Total cuentas activas', '', (SELECT COUNT(*) FROM bank_accounts WHERE status = 'active')
UNION ALL
SELECT 'Total tarjetas activas', '', (SELECT COUNT(*) FROM cards WHERE status = 'active')
UNION ALL
SELECT 'Préstamos activos', '', (SELECT COUNT(*) FROM loans WHERE status = 'active')
UNION ALL
SELECT 'Transacciones hoy', '', (SELECT COUNT(*) FROM transactions WHERE DATE(date) = CURDATE())
UNION ALL
SELECT 'Balance total sistema', '', (SELECT FORMAT(SUM(balance), 2) FROM bank_accounts WHERE status = 'active');

-- 15. Auditoría de integridad referencial
SELECT 
    'Verificación de llaves foráneas' as auditoria,
    'users.role_id' as relacion,
    COUNT(*) as registros_huerfanos
FROM users u 
LEFT JOIN roles r ON u.role_id = r.role_id 
WHERE r.role_id IS NULL
UNION ALL
SELECT 
    'Verificación de llaves foráneas',
    'bank_accounts.user_id',
    COUNT(*)
FROM bank_accounts ba 
LEFT JOIN users u ON ba.user_id = u.user_id 
WHERE u.user_id IS NULL
UNION ALL
SELECT 
    'Verificación de llaves foráneas',
    'cards.account_id',
    COUNT(*)
FROM cards c 
LEFT JOIN bank_accounts ba ON c.account_id = ba.account_id 
WHERE ba.account_id IS NULL;