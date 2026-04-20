-- Adicionar coluna photos na tabela ht_room_types (se ainda não existir)
ALTER TABLE "ht_room_types"
ADD COLUMN IF NOT EXISTS "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Verificar se a coluna existe
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'ht_room_types'
  AND column_name = 'photos';
