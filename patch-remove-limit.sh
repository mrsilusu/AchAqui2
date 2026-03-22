#!/bin/bash
# Remove o limite de 60 do findAll
python3 - "backend/src/business/business.service.ts" << 'PY'
import sys
path = sys.argv[1]
with open(path) as f: src = f.read()

# Remover o limit=60 e take:limit, restaurar o findAll original
old = """  findAll(limit = 60) {
    return this.prisma.business.findMany({
      where:   { isActive: true },
      take:    limit,
      orderBy: { id: 'asc' },
      select: {
        id: true, name: true, category: true, description: true,
        latitude: true, longitude: true, municipality: true,
        isActive: true, isClaimed: true, googlePlaceId: true,
        metadata: true,
        owner:       { select: { id: true, name: true } },
        htRoomTypes: {
          where:  { rooms: { some: {} } },
          select: {
            id: true, name: true, pricePerNight: true,
            maxGuests: true, amenities: true, photos: true,
            _count: { select: { rooms: true } },
          },
        },
      },
    });
  }"""

new = """  findAll() {
    return this.prisma.business.findMany({
      where: { isActive: true },
      include: {
        owner: {
          select: { id: true, name: true },
        },
        htRoomTypes: {
          where: { rooms: { some: {} } },
          select: {
            id: true, name: true, description: true,
            pricePerNight: true, maxGuests: true,
            totalRooms: true, available: true,
            amenities: true, photos: true,
            _count: { select: { rooms: true } },
          },
        },
      },
    });
  }"""

if old in src:
    src = src.replace(old, new)
    with open(path, 'w') as f: f.write(src)
    print("  ✅ limite removido -- findAll devolve todos os negócios")
else:
    print("  ❌ padrão não encontrado -- verificar manualmente")
    # Mostrar o findAll actual
    idx = src.find('findAll')
    print("  findAll actual:", repr(src[idx:idx+200]))
PY

echo ""
echo "Reinicia o backend: cd backend && npm run start:dev"
