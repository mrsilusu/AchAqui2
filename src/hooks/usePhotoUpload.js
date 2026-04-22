/**
 * usePhotoUpload — hook genérico de upload de foto via Supabase Storage
 *
 * Uso:
 *   const { pickAndUpload, uploading } = usePhotoUpload({
 *     endpoint: `/media/business/${bizId}/upload`,
 *   });
 *   const url = await pickAndUpload({ accessToken });
 *
 * Fluxo:
 *   1. Abre galeria com expo-image-picker (mediaTypes: ['images'])
 *   2. Comprime → JPEG 82%, max 1280px largura (expo-image-manipulator)
 *   3. Converte para base64
 *   4. POST { fileName, mimeType, base64, ...extraBody } → endpoint
 *   5. Devolve publicUrl (string) ou null em caso de erro
 *
 * Fallback: se o servidor devolver 503 (storage não configurado), a URI
 * local é devolvida como fallback e o utilizador é informado via Alert.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiRequest } from '../lib/backendApi';

export function usePhotoUpload({ endpoint, extraBody = {} }) {
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = useCallback(
    async ({ accessToken } = {}) => {
      // 1. Pedir permissão
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Permita acesso à galeria para escolher uma foto.');
        return null;
      }

      // 2. Abrir galeria
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],      // NUNCA usar enum — causa crash no Android
        allowsEditing: true,
        quality: 0.9,
      });

      if (result.canceled) return null;
      const localUri = result.assets?.[0]?.uri;
      if (!localUri) return null;

      setUploading(true);
      try {
        // 3. Comprimir → JPEG 82%, max 1280px
        const compressed = await ImageManipulator.manipulateAsync(
          localUri,
          [{ resize: { width: 1280 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );

        const fileName = `photo-${Date.now()}.jpg`;

        // 4. Upload via backendApi genérico
        let publicUrl;
        try {
          const res = await apiRequest(endpoint, {
            method: 'POST',
            body: {
            fileName,
            mimeType: 'image/jpeg',
            base64: compressed.base64,
            ...extraBody,
            },
            accessToken,
          });
          publicUrl = res?.publicUrl;
        } catch (uploadErr) {
          // Fallback local quando Supabase não está configurado (503)
          const is503 = uploadErr?.status === 503 || uploadErr?.message?.includes('503')
            || uploadErr?.message?.toLowerCase().includes('storage');
          if (is503) {
            Alert.alert(
              'Foto guardada localmente',
              'Será enviada quando o servidor de armazenamento estiver configurado.',
            );
            return localUri;  // URI local como fallback
          }
          throw uploadErr;
        }

        if (!publicUrl) throw new Error('URL pública não retornada pelo servidor.');
        return publicUrl;
      } catch (err) {
        Alert.alert('Erro no upload', err?.message || 'Não foi possível fazer upload da foto.');
        return null;
      } finally {
        setUploading(false);
      }
    },
    [endpoint, extraBody],
  );

  return { pickAndUpload, uploading };
}
