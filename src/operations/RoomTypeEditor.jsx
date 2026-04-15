import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator, Modal, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoomPhotoUpload } from '../hooks/useRoomPhotoUpload';
import { ROOM_AMENITIES } from '../lib/roomAmenities';
import { backendApi } from '../lib/backendApi';

export default function RoomTypeEditor({
  roomType,
  businessId,
  accessToken,
  onSaved,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState(roomType?.photos ?? []);
  const [amenities, setAmenities] = useState(roomType?.amenities ?? []);
  const [saving, setSaving] = useState(false);
  const [showAmenities, setShowAmenities] = useState(false);

  const { pickAndUpload, uploading, progress } = useRoomPhotoUpload();

  const handleAddPhotos = useCallback(async () => {
    if (!roomType?.id || !businessId) {
      Alert.alert('Dados em falta', 'Não foi possível identificar o quarto para adicionar a foto.');
      return;
    }

    const newUrls = await pickAndUpload({
      roomTypeId: roomType.id,
      businessId,
      accessToken,
      currentCount: photos.length,
    });
    if (newUrls.length > 0) {
      setPhotos((prev) => [...prev, ...newUrls]);
    }
  }, [pickAndUpload, roomType?.id, businessId, accessToken, photos.length]);

  const handleRemovePhoto = useCallback((url) => {
    Alert.alert('Remover foto', 'Tens a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover', style: 'destructive',
        onPress: () => setPhotos((prev) => prev.filter((u) => u !== url)),
      },
    ]);
  }, []);

  const handleSetPrimary = useCallback((url) => {
    setPhotos((prev) => [url, ...prev.filter((u) => u !== url)]);
  }, []);

  const toggleAmenity = useCallback((id) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await backendApi.htUpdateRoomType(roomType.id, businessId, { photos, amenities }, accessToken);
      Alert.alert('Guardado', 'Tipo de quarto actualizado com sucesso.');
      onSaved?.({ ...roomType, photos, amenities });
    } catch (e) {
      Alert.alert('Erro', e?.message || 'Não foi possível guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={s.sectionTitle}>Fotos do Quarto</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoRow}>
          {photos.map((url, idx) => (
            <TouchableOpacity
              key={url}
              onPress={() => Alert.alert(
                idx === 0 ? 'Foto Principal' : 'Opções',
                '',
                [
                  idx !== 0 && { text: 'Definir como principal', onPress: () => handleSetPrimary(url) },
                  { text: 'Remover', style: 'destructive', onPress: () => handleRemovePhoto(url) },
                  { text: 'Cancelar', style: 'cancel' },
                ].filter(Boolean),
              )}
              style={s.photoThumb}
            >
              <Image source={{ uri: url }} style={s.photoImg} />
              {idx === 0 && (
                <View style={s.primaryBadge}>
                  <Text style={s.primaryBadgeText}>Principal</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}

          {photos.length < 10 && (
            <TouchableOpacity
              style={[s.photoThumb, s.addPhotoBtn]}
              onPress={handleAddPhotos}
              disabled={uploading}
            >
              {uploading
                ? <ActivityIndicator color="#1565C0" />
                : <Text style={s.addPhotoBtnText}>+</Text>
              }
            </TouchableOpacity>
          )}
        </ScrollView>

        {uploading && (
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        )}

        <View style={s.photoMeta}>
          <Text style={s.photoCount}>{photos.length}/10 fotos</Text>
          {photos.length < 10 && (
            <TouchableOpacity onPress={handleAddPhotos} disabled={uploading} style={s.addBtn}>
              <Text style={s.addBtnText}>+ Adicionar Foto</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[s.sectionTitle, { marginTop: 20 }]}>Comodidades</Text>

        <View style={s.amenityPreview}>
          {ROOM_AMENITIES.flatMap((c) => c.items)
            .filter((i) => amenities.includes(i.id))
            .slice(0, 4)
            .map((item) => (
              <Text key={item.id} style={s.amenityChip}>{item.icon} {item.label}</Text>
            ))
          }
          {amenities.length === 0 && (
            <Text style={s.amenityNone}>Nenhuma comodidade seleccionada</Text>
          )}
        </View>

        <TouchableOpacity style={s.editAmenitiesBtn} onPress={() => setShowAmenities(true)}>
          <Text style={s.editAmenitiesBtnText}>
            {amenities.length > 0 ? `Editar comodidades (${amenities.length} activas)` : 'Seleccionar comodidades'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.saveBtnText}>Guardar alterações</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={s.closeBtn} onPress={onClose}>
          <Text style={s.closeBtnText}>Fechar editor</Text>
        </TouchableOpacity>
      </ScrollView>

      <AmenitiesModal
        visible={showAmenities}
        selected={amenities}
        insets={insets}
        onToggle={toggleAmenity}
        onClose={() => setShowAmenities(false)}
      />
    </SafeAreaView>
  );
}

function AmenitiesModal({ visible, selected, insets, onToggle, onClose }) {
  const topInset = (insets?.top ?? 0) > 0 ? insets.top : (Platform.OS === 'ios' ? 44 : 12);
  const bottomInset = (insets?.bottom ?? 0) > 0 ? insets.bottom : (Platform.OS === 'ios' ? 12 : 16);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={s.modalSafeArea} edges={['top', 'bottom']}>
        <View style={[s.modalHeader, { paddingTop: topInset + 10 }]}> 
          <Text style={s.modalTitle}>Comodidades do Quarto</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={s.modalClose}>Concluir</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[s.modalContent, { paddingBottom: bottomInset + 84 }]}>
          {ROOM_AMENITIES.map((cat) => (
            <View key={cat.category} style={{ marginBottom: 20 }}>
              <Text style={s.catTitle}>{cat.category}</Text>
              {cat.items.map((item) => {
                const active = selected.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[s.amenityRow, active && s.amenityRowActive]}
                    onPress={() => onToggle(item.id)}
                  >
                    <Text style={s.amenityIcon}>{item.icon}</Text>
                    <Text style={[s.amenityLabel, active && s.amenityLabelActive]}>
                      {item.label}
                    </Text>
                    <Text style={s.amenityCheck}>{active ? '✅' : '⬜'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </ScrollView>

        <View style={[s.modalFooter, { paddingBottom: bottomInset }]}> 
          <TouchableOpacity style={s.modalDoneBtn} onPress={onClose}>
            <Text style={s.modalDoneBtnText}>Concluir</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safeArea:        { flex: 1, backgroundColor: '#F8FAFC' },
  container:       { flex: 1, backgroundColor: '#F8FAFC' },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  photoRow:        { flexDirection: 'row', marginBottom: 8 },
  photoThumb:      { width: 90, height: 68, borderRadius: 8, marginRight: 8, overflow: 'hidden', backgroundColor: '#E2E8F0' },
  photoImg:        { width: '100%', height: '100%' },
  primaryBadge:    { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(21,101,192,0.85)', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  primaryBadgeText:{ color: '#fff', fontSize: 9, fontWeight: '700' },
  addPhotoBtn:     { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#1565C0', borderStyle: 'dashed' },
  addPhotoBtnText: { fontSize: 28, color: '#1565C0', fontWeight: '300' },
  progressBar:     { height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, marginBottom: 6 },
  progressFill:    { height: '100%', backgroundColor: '#1565C0', borderRadius: 2 },
  photoMeta:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  photoCount:      { fontSize: 12, color: '#94A3B8' },
  addBtn:          { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#EFF6FF', borderRadius: 8 },
  addBtnText:      { fontSize: 13, color: '#1565C0', fontWeight: '600' },
  amenityPreview:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  amenityChip:     { fontSize: 12, color: '#1E293B', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  amenityNone:     { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },
  editAmenitiesBtn:{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#1565C0', alignItems: 'center', marginBottom: 20 },
  editAmenitiesBtnText: { color: '#1565C0', fontWeight: '600', fontSize: 14 },
  saveBtn:         { backgroundColor: '#1565C0', padding: 15, borderRadius: 12, alignItems: 'center' },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  closeBtn:        { marginTop: 10, alignItems: 'center', padding: 12 },
  closeBtnText:    { color: '#64748B', fontSize: 14, fontWeight: '600' },
  modalSafeArea:   { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalContent:    { padding: 16, paddingBottom: 40 },
  modalTitle:      { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  modalClose:      { fontSize: 15, color: '#1565C0', fontWeight: '600' },
  modalFooter:     { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  modalDoneBtn:    { backgroundColor: '#1565C0', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  modalDoneBtnText:{ color: '#fff', fontSize: 15, fontWeight: '700' },
  catTitle:        { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  amenityRow:      { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  amenityRowActive:{ backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  amenityIcon:     { fontSize: 18, marginRight: 10 },
  amenityLabel:    { flex: 1, fontSize: 14, color: '#475569' },
  amenityLabelActive: { color: '#1E293B', fontWeight: '600' },
  amenityCheck:    { fontSize: 16 },
});
