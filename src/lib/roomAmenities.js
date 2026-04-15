export const ROOM_AMENITIES = [
  {
    category: 'Tecnologia',
    items: [
      { id: 'wifi', label: 'Wi-Fi gratuito', icon: '📶' },
      { id: 'tv', label: 'TV', icon: '📺' },
      { id: 'tv_satellite', label: 'TV por satélite', icon: '📡' },
      { id: 'phone', label: 'Telefone', icon: '☎️' },
      { id: 'safe', label: 'Cofre', icon: '🔒' },
    ],
  },
  {
    category: 'Conforto',
    items: [
      { id: 'ac', label: 'Ar condicionado', icon: '❄️' },
      { id: 'heating', label: 'Aquecimento', icon: '🌡️' },
      { id: 'fan', label: 'Ventoinha', icon: '💨' },
      { id: 'minibar', label: 'Minibar', icon: '🍺' },
      { id: 'fridge', label: 'Frigorífico', icon: '🧊' },
      { id: 'kettle', label: 'Chaleira eléctrica', icon: '☕' },
    ],
  },
  {
    category: 'Casa de Banho',
    items: [
      { id: 'private_bath', label: 'Casa de banho privativa', icon: '🚿' },
      { id: 'bathtub', label: 'Banheira', icon: '🛁' },
      { id: 'shower', label: 'Duche', icon: '🚿' },
      { id: 'hairdryer', label: 'Secador de cabelo', icon: '💨' },
      { id: 'toiletries', label: 'Artigos de higiene', icon: '🧴' },
    ],
  },
  {
    category: 'Vista e Espaço',
    items: [
      { id: 'balcony', label: 'Varanda', icon: '🌅' },
      { id: 'sea_view', label: 'Vista mar', icon: '🌊' },
      { id: 'city_view', label: 'Vista cidade', icon: '🏙️' },
      { id: 'garden_view', label: 'Vista jardim', icon: '🌿' },
      { id: 'pool_view', label: 'Vista piscina', icon: '🏊' },
    ],
  },
  {
    category: 'Cama e Roupa',
    items: [
      { id: 'king_bed', label: 'Cama King', icon: '🛏️' },
      { id: 'twin_beds', label: 'Camas twin', icon: '🛏️' },
      { id: 'extra_bed', label: 'Cama extra disponível', icon: '🛏️' },
      { id: 'linens', label: 'Roupa de cama incluída', icon: '🛏️' },
      { id: 'towels', label: 'Toalhas incluídas', icon: '🪣' },
    ],
  },
  {
    category: 'Serviços',
    items: [
      { id: 'room_service', label: 'Room service', icon: '🍽️' },
      { id: 'cleaning', label: 'Limpeza diária', icon: '🧹' },
      { id: 'laundry', label: 'Lavandaria', icon: '👕' },
      { id: 'breakfast', label: 'Pequeno-almoço incluído', icon: '🥐' },
      { id: 'parking', label: 'Estacionamento', icon: '🚗' },
      { id: 'airport', label: 'Transfer aeroporto', icon: '✈️' },
    ],
  },
  {
    category: 'Acessibilidade',
    items: [
      { id: 'wheelchair', label: 'Acesso cadeira de rodas', icon: '♿' },
      { id: 'ground_floor', label: 'Rés-do-chão', icon: '🏠' },
    ],
  },
];

export function getAmenitiesByCategory(selectedIds = []) {
  const set = new Set(selectedIds);
  return ROOM_AMENITIES
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => set.has(i.id)),
    }))
    .filter((cat) => cat.items.length > 0);
}

export function getAmenitiesPreview(selectedIds = [], max = 4) {
  const all = ROOM_AMENITIES.flatMap((c) => c.items).filter((i) => selectedIds.includes(i.id));
  return { preview: all.slice(0, max), remaining: Math.max(0, all.length - max) };
}
