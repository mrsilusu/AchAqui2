import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, View, Text, Image, ScrollView, TouchableOpacity,
  FlatList, Dimensions, StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { getAmenitiesByCategory } from '../lib/roomAmenities';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 220;

export default function RoomDetailModal({
  visible,
  roomType,
  business,
  initialPhotoIdx,
  isUnavailable,
  isChecking,
  onClose,
  onBook,
}) {
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(initialPhotoIdx ?? 0);
  const carouselRef = useRef(null);

  useEffect(() => {
    setActiveIdx(initialPhotoIdx ?? 0);
  }, [roomType?.id, initialPhotoIdx]);

  if (!roomType) return null;

  const photos = roomType.photos?.length > 0 ? roomType.photos : null;
  const grouped = getAmenitiesByCategory(roomType.amenities ?? []);

  const scrollToPhoto = (idx) => {
    setActiveIdx(idx);
    carouselRef.current?.scrollToIndex({ index: idx, animated: true });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      allowSwipeDismissal={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={d.container} edges={['top', 'right', 'bottom', 'left']}>
        <View style={d.header}>
          <TouchableOpacity onPress={onClose} style={d.closeBtn}>
            <Text style={d.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={d.headerTitle} numberOfLines={1}>{roomType.name}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {photos ? (
            <>
              <View style={{ height: CAROUSEL_HEIGHT }}>
                <FlatList
                  ref={carouselRef}
                  data={photos}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(url) => url}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setActiveIdx(idx);
                  }}
                  renderItem={({ item: url }) => (
                    <Image
                      source={{ uri: url }}
                      style={{ width: SCREEN_WIDTH, height: CAROUSEL_HEIGHT }}
                      resizeMode="contain"
                    />
                  )}
                  getItemLayout={(_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i })}
                />
                <View style={d.photoCounter}>
                  <Text style={d.photoCounterText}>{activeIdx + 1}/{photos.length}</Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={d.thumbRow}>
                {photos.map((url, i) => (
                  <TouchableOpacity key={url} onPress={() => scrollToPhoto(i)}>
                    <View style={[d.thumb, i === activeIdx && d.thumbActive]}>
                      <Image source={{ uri: url }} style={d.thumbImage} resizeMode="contain" />
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          ) : (
            <View style={d.noPhoto}>
              <Text style={d.noPhotoIcon}>🛏️</Text>
            </View>
          )}

          <View style={d.section}>
            <Text style={d.sectionTitle}>Sobre o quarto</Text>
            <Text style={d.priceText}>
              {roomType.pricePerNight?.toLocaleString('pt-AO')} Kz / noite
            </Text>
            <Text style={d.metaText}>
              Até {roomType.maxGuests} hóspedes · Mínimo {roomType.minNights ?? 1} noite
            </Text>
            {roomType.description ? <Text style={d.description}>{roomType.description}</Text> : null}
          </View>

          {grouped.length > 0 && (
            <View style={d.section}>
              <Text style={d.sectionTitle}>Comodidades</Text>
              {grouped.map((cat) => (
                <View key={cat.category} style={{ marginBottom: 10 }}>
                  <Text style={d.catLabel}>{cat.category}</Text>
                  {cat.items.map((item) => (
                    <Text key={item.id} style={d.amenityItem}>{item.icon}  {item.label}</Text>
                  ))}
                </View>
              ))}
            </View>
          )}

          {business && (
            <View style={d.section}>
              <Text style={d.sectionTitle}>Política</Text>
              <Text style={d.policyText}>
                Check-in: {business.checkInTime ?? '14:00'} · Check-out: {business.checkOutTime ?? '12:00'}
              </Text>
              {business.cancellationPolicy ? <Text style={d.policyText}>{business.cancellationPolicy}</Text> : null}
            </View>
          )}
        </ScrollView>

        <View style={[d.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}> 
          <TouchableOpacity
            style={[d.bookBtn, isUnavailable && d.bookBtnDisabled]}
            disabled={isUnavailable}
            onPress={() => onBook?.(roomType)}
          >
            <Text style={d.bookBtnText}>
              {isUnavailable ? 'Indisponível nestas datas' : 'Reservar agora →'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const d = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#F8FAFC' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  closeBtn:        { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  closeBtnText:    { fontSize: 18, color: '#64748B' },
  headerTitle:     { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#1E293B' },
  photoCounter:    { position: 'absolute', bottom: 10, right: 12, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  photoCounterText:{ color: '#fff', fontSize: 12, fontWeight: '600' },
  thumbRow:        { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1E293B' },
  thumb:           { width: 80, height: 60, borderRadius: 8, marginRight: 6, borderWidth: 2, borderColor: 'transparent', overflow: 'hidden', backgroundColor: '#F1F5F9' },
  thumbImage:      { width: '100%', height: '100%' },
  thumbActive:     { borderColor: '#60A5FA' },
  noPhoto:         { height: CAROUSEL_HEIGHT, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  noPhotoIcon:     { fontSize: 60 },
  section:         { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  priceText:       { fontSize: 18, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  metaText:        { fontSize: 14, color: '#64748B', marginBottom: 6 },
  description:     { fontSize: 14, color: '#475569', lineHeight: 20, marginTop: 6 },
  catLabel:        { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 },
  amenityItem:     { fontSize: 14, color: '#475569', marginBottom: 3, paddingLeft: 4 },
  policyText:      { fontSize: 14, color: '#475569', marginBottom: 4 },
  footer:          { padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#fff' },
  bookBtn:         { backgroundColor: '#1565C0', borderRadius: 12, padding: 16, alignItems: 'center' },
  bookBtnDisabled: { backgroundColor: '#94A3B8' },
  bookBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  bookBtnTextDisabled: { color: '#94A3B8' },
});
