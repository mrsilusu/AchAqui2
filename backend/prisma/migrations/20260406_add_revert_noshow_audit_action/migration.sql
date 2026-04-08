-- Migration: add HT_BOOKING_REVERT_NO_SHOW to AuditAction enum
-- PostgreSQL ADD VALUE é DDL não transaccional — executar fora de BEGIN/COMMIT
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'HT_BOOKING_REVERT_NO_SHOW' AFTER 'HT_BOOKING_NO_SHOW';
