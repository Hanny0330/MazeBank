-- ============================================
-- CONSULTAS PARA INTERFACES DEL SISTEMA BANCARIO
-- ============================================

-- ============================================
-- 1. PANTALLA DE LOGIN / AUTENTICACIÓN
-- ============================================
use MazeBank;
-- Validar credenciales de usuario
SELECT 
    u.user_id,
    u.name,
    u.email,
    r.role_name,
    u.status,
    u.ine_approval
FROM users u
JOIN roles r ON u.role_id = r.role_id
WHERE u.email = ? AND u.password = SHA2(?, 256) AND u.status = 'active';

-- Crear token de sesión (INSERT después del login exitoso)
INSERT INTO tokens (user_id, token, operation_type, expiration_date)
VALUES (?, UUID(), 'login', DATE_ADD(NOW(), INTERVAL 24 HOUR));

-- Validar token de sesión activo
SELECT 
    t.token_id,
    t.user_id,
    u.name,
    u.email,
    r.role_name
FROM tokens t
JOIN users u ON t.user_id = u.user_id
JOIN roles r ON u.role_id = r.role_id
WHERE t.token = ? 
AND t.operation_type = 'login' 
AND t.expiration_date > NOW() 
AND t.used = FALSE;

-- ============================================
-- 2. DASHBOARD PRINCIPAL (por tipo de usuario)
-- ============================================

-- Dashboard CLIENTE
SELECT 
    u.name as nombre_cliente,
    COUNT(DISTINCT ba.account_id) as total_cuentas,
    SUM(ba.balance) as balance_total,
    COUNT(DISTINCT c.card_id) as total_tarjetas,
    COUNT(DISTINCT l.loan_id) as total_prestamos,
    (SELECT COUNT(*) FROM transactions t 
     JOIN bank_accounts ba2 ON (t.source_account_id = ba2.account_id OR t.destination_account_id = ba2.account_id)
     WHERE ba2.user_id = u.user_id AND DATE(t.date) = CURDATE()) as transacciones_hoy
FROM users u
LEFT JOIN bank_accounts ba ON u.user_id = ba.user_id AND ba.status = 'active'
LEFT JOIN cards c ON ba.account_id = c.account_id AND c.status = 'active'
LEFT JOIN loans l ON u.user_id = l.user_id AND l.status = 'active'
WHERE u.user_id = ?
GROUP BY u.user_id, u.name;

-- Dashboard EJECUTIVO
SELECT 
    COUNT(DISTINCT u.user_id) as clientes_asignados,
    COUNT(DISTINCT l.loan_id) as prestamos_pendientes_aprobacion,
    COUNT(DISTINCT u2.user_id) as ines_pendientes_revision,
    SUM(l.amount) as monto_total_prestamos_pendientes
FROM users u
JOIN roles r ON u.role_id = r.role_id
LEFT JOIN loans l ON u.user_id = l.user_id AND l.status = 'pending'
LEFT JOIN users u2 ON u2.ine_approval = FALSE AND u2.role_id = 1
WHERE r.role_name = 'cliente';

-- Dashboard GERENTE
SELECT 
    (SELECT COUNT(*) FROM users WHERE role_id = 1) as total_clientes,
    (SELECT COUNT(*) FROM users WHERE role_id = 2) as total_ejecutivos,
    (SELECT SUM(balance) FROM bank_accounts WHERE status = 'active') as balance_total_banco,
    (SELECT COUNT(*) FROM loans WHERE status = 'active') as prestamos_activos,
    (SELECT COUNT(*) FROM transactions WHERE DATE(date) = CURDATE()) as transacciones_hoy,
    (SELECT COUNT(*) FROM users WHERE ine_approval = FALSE AND role_id = 1) as ines_pendientes;

-- ============================================
-- 3. GESTIÓN DE TOKENS Y VERIFICACIONES
-- ============================================

-- Consultar token pendiente de aprobación
SELECT 
    t.token_id,
    t.token,
    u.name as usuario,
    u.email,
    t.operation_type,
    t.creation_date,
    t.expiration_date,
    CASE 
        WHEN t.expiration_date < NOW() THEN 'Expirado'
        WHEN t.used = TRUE THEN 'Usado'
        ELSE 'Pendiente'
    END as estado
FROM tokens t
JOIN users u ON t.user_id = u.user_id
WHERE t.token = ? AND t.used = FALSE;

-- Aprobar/Usar token (UPDATE)
UPDATE tokens 
SET used = TRUE 
WHERE token = ? AND expiration_date > NOW() AND used = FALSE;

-- Crear token para operación específica
INSERT INTO tokens (user_id, token, operation_type, expiration_date)
VALUES (?, UUID(), ?, 
    CASE 
        WHEN ? = '2fa' THEN DATE_ADD(NOW(), INTERVAL 10 MINUTE)
        WHEN ? = 'password_reset' THEN DATE_ADD(NOW(), INTERVAL 1 HOUR)
        WHEN ? = 'email_verification' THEN DATE_ADD(NOW(), INTERVAL 24 HOUR)
        ELSE DATE_ADD(NOW(), INTERVAL 1 HOUR)
    END
);

-- Listar tokens pendientes por usuario
SELECT 
    t.token_id,
    t.operation_type,
    t.creation_date,
    t.expiration_date,
    TIMESTAMPDIFF(MINUTE, NOW(), t.expiration_date) as minutos_restantes
FROM tokens t
WHERE t.user_id = ? AND t.used = FALSE AND t.expiration_date > NOW()
ORDER BY t.creation_date DESC;

-- ============================================
-- 4. PANTALLA DE CUENTAS BANCARIAS
-- ============================================

-- Lista de cuentas por usuario
SELECT 
    ba.account_id,
    ba.account_number,
    ba.account_type,
    ba.balance,
    ba.opening_date,
    ba.status,
    COUNT(c.card_id) as tarjetas_asociadas
FROM bank_accounts ba
LEFT JOIN cards c ON ba.account_id = c.account_id AND c.status = 'active'
WHERE ba.user_id = ?
GROUP BY ba.account_id
ORDER BY ba.opening_date DESC;

-- Detalle de cuenta específica
SELECT 
    ba.account_number,
    ba.account_type,
    ba.balance,
    ba.opening_date,
    ba.status,
    u.name as propietario,
    COUNT(t.transaction_id) as total_transacciones,
    MAX(t.date) as ultima_transaccion
FROM bank_accounts ba
JOIN users u ON ba.user_id = u.user_id
LEFT JOIN transactions t ON (ba.account_id = t.source_account_id OR ba.account_id = t.destination_account_id)
WHERE ba.account_id = ?
GROUP BY ba.account_id;

-- ============================================
-- 5. PANTALLA DE TARJETAS
-- ============================================

-- Lista de tarjetas por usuario
SELECT 
    c.card_id,
    c.card_number,
    ct.type_name,
    c.expiration_date,
    c.credit_limit,
    c.status,
    ba.account_number,
    ba.balance as saldo_cuenta,
    CASE 
        WHEN c.expiration_date < CURDATE() THEN 'Vencida'
        WHEN c.status = 'active' THEN 'Activa'
        ELSE c.status
    END as estado_tarjeta
FROM cards c
JOIN card_types ct ON c.card_type_id = ct.type_id
JOIN bank_accounts ba ON c.account_id = ba.account_id
WHERE ba.user_id = ?
ORDER BY c.expiration_date DESC;

-- Detalle de tarjeta específica
SELECT 
    c.card_number,
    ct.type_name,
    ct.description,
    c.expiration_date,
    c.credit_limit,
    c.is_virtual,
    c.status,
    ba.account_number,
    ba.account_type,
    u.name as propietario
FROM cards c
JOIN card_types ct ON c.card_type_id = ct.type_id
JOIN bank_accounts ba ON c.account_id = ba.account_id
JOIN users u ON ba.user_id = u.user_id
WHERE c.card_id = ?;

-- ============================================
-- 6. PANTALLA DE PRÉSTAMOS
-- ============================================

-- Lista de préstamos por usuario
SELECT 
    l.loan_id,
    l.amount,
    l.interest_rate,
    l.term_months,
    l.application_date,
    l.status,
    l.pending_balance,
    ROUND((l.amount - COALESCE(l.pending_balance, l.amount)) / l.amount * 100, 2) as porcentaje_pagado
FROM loans l
WHERE l.user_id = ?
ORDER BY l.application_date DESC;

-- Detalle de préstamo específico
SELECT 
    l.loan_id,
    u.name as cliente,
    l.amount as monto_original,
    l.interest_rate,
    l.term_months,
    l.application_date,
    l.status,
    l.pending_balance,
    ROUND(l.amount / l.term_months, 2) as pago_mensual_estimado,
    CASE 
        WHEN l.status = 'active' THEN DATEDIFF(DATE_ADD(l.application_date, INTERVAL l.term_months MONTH), CURDATE())
        ELSE NULL
    END as dias_restantes
FROM loans l
JOIN users u ON l.user_id = u.user_id
WHERE l.loan_id = ?;

-- Préstamos pendientes de aprobación (para ejecutivos)
SELECT 
    l.loan_id,
    u.name as cliente,
    u.email,
    u.ine_approval,
    l.amount,
    l.interest_rate,
    l.term_months,
    l.application_date,
    DATEDIFF(NOW(), l.application_date) as dias_pendiente
FROM loans l
JOIN users u ON l.user_id = u.user_id
WHERE l.status = 'pending'
ORDER BY l.application_date ASC;

-- ============================================
-- 7. HISTORIAL DE TRANSACCIONES
-- ============================================

-- Transacciones por cuenta
SELECT 
    t.transaction_id,
    t.type,
    t.amount,
    t.description,
    t.date,
    t.status,
    CASE 
        WHEN t.source_account_id = ? THEN 'Salida'
        WHEN t.destination_account_id = ? THEN 'Entrada'
        ELSE 'Relacionada'
    END as direccion,
    ba_dest.account_number as cuenta_destino,
    ba_src.account_number as cuenta_origen
FROM transactions t
LEFT JOIN bank_accounts ba_src ON t.source_account_id = ba_src.account_id
LEFT JOIN bank_accounts ba_dest ON t.destination_account_id = ba_dest.account_id
WHERE t.source_account_id = ? OR t.destination_account_id = ?
ORDER BY t.date DESC
LIMIT 50;

-- Resumen de transacciones por período
SELECT 
    t.type,
    COUNT(*) as cantidad,
    SUM(t.amount) as monto_total,
    AVG(t.amount) as monto_promedio
FROM transactions t
JOIN bank_accounts ba ON (t.source_account_id = ba.account_id OR t.destination_account_id = ba.account_id)
WHERE ba.user_id = ? 
AND t.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY t.type
ORDER BY monto_total DESC;

-- ============================================
-- 8. PANTALLA DE BENEFICIARIOS
-- ============================================

-- Lista de beneficiarios por usuario
SELECT 
    b.beneficiary_id,
    b.name,
    b.account_number,
    b.bank,
    COUNT(t.transaction_id) as transacciones_realizadas,
    MAX(t.date) as ultima_transaccion
FROM beneficiaries b
LEFT JOIN transactions t ON b.account_number = (
    SELECT ba.account_number 
    FROM bank_accounts ba 
    WHERE ba.account_id = t.destination_account_id
)
WHERE b.user_id = ?
GROUP BY b.beneficiary_id
ORDER BY b.name;

-- ============================================
-- 9. OPERACIONES DE ACTUALIZACIÓN ESPECÍFICAS
-- ============================================

-- Actualizar estado de cuenta
UPDATE bank_accounts 
SET status = ? 
WHERE account_id = ? AND user_id = ?;

-- Bloquear/Desbloquear tarjeta
UPDATE cards 
SET status = ? 
WHERE card_id = ? AND account_id IN (
    SELECT account_id FROM bank_accounts WHERE user_id = ?
);

-- Aprobar préstamo
UPDATE loans 
SET status = 'approved', pending_balance = amount 
WHERE loan_id = ? AND status = 'pending';

-- Rechazar préstamo
UPDATE loans 
SET status = 'rejected' 
WHERE loan_id = ? AND status = 'pending';

-- Aprobar INE de usuario
UPDATE users 
SET ine_approval = TRUE 
WHERE user_id = ? AND ine_approval = FALSE;

-- Realizar pago de préstamo
UPDATE loans 
SET pending_balance = pending_balance - ? 
WHERE loan_id = ? AND status = 'active' AND pending_balance >= ?;

-- Insertar nueva transacción
INSERT INTO transactions (source_account_id, destination_account_id, type, amount, description)
VALUES (?, ?, ?, ?, ?);

-- Actualizar balance después de transacción
UPDATE bank_accounts 
SET balance = balance + ? 
WHERE account_id = ?;

UPDATE bank_accounts 
SET balance = balance - ? 
WHERE account_id = ?;

-- ============================================
-- 10. REPORTES PARA GERENCIA
-- ============================================

-- Reporte diario de operaciones
SELECT 
    DATE(t.date) as fecha,
    t.type,
    COUNT(*) as cantidad_operaciones,
    SUM(t.amount) as monto_total,
    AVG(t.amount) as monto_promedio
FROM transactions t
WHERE t.date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
GROUP BY DATE(t.date), t.type
ORDER BY fecha DESC, monto_total DESC;

-- Usuarios más activos
SELECT 
    u.name,
    u.email,
    COUNT(DISTINCT t.transaction_id) as total_transacciones,
    SUM(ba.balance) as balance_total,
    MAX(t.date) as ultima_actividad
FROM users u
JOIN bank_accounts ba ON u.user_id = ba.user_id
LEFT JOIN transactions t ON (ba.account_id = t.source_account_id OR ba.account_id = t.destination_account_id)
WHERE u.role_id = 1  -- Solo clientes
GROUP BY u.user_id
HAVING total_transacciones > 0
ORDER BY total_transacciones DESC
LIMIT 10;

-- Estado del sistema en tiempo real
SELECT 
    'Usuarios conectados' as metrica,
    COUNT(*) as valor
FROM tokens 
WHERE operation_type = 'login' 
AND expiration_date > NOW() 
AND used = FALSE
UNION ALL
SELECT 
    'Transacciones última hora',
    COUNT(*)
FROM transactions 
WHERE date >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
UNION ALL
SELECT 
    'Préstamos pendientes aprobación',
    COUNT(*)
FROM loans 
WHERE status = 'pending'
UNION ALL
SELECT 
    'INEs pendientes verificación',
    COUNT(*)
FROM users 
WHERE ine_approval = FALSE AND role_id = 1;