import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { backendApi } from '../lib/backendApi';
import { BACKEND_URL } from '../lib/runtimeConfig';

export function useRoomPhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const requestRoomPhotoSignedUrl = async ({ roomTypeId, businessId, fileName, accessToken }) => {
    const response = await fetch(`${BACKEND_URL}/media/room-type/signed-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ roomTypeId, businessId, fileName }),
    });

    if (!response.ok) {
      const raw = await response.text();
      let message = raw || `Erro HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.message) {
          message = Array.isArray(parsed.message) ? parsed.message.join('; ') : String(parsed.message);
        }
      } catch {
        // noop: keep raw message
      }
      const error = new Error(message);
      error.status = response.status;
      error.rawError = raw;
      throw error;
    }

    return response.json();
  };

  const isStorageUnavailable = (error) => {
    const status = Number(error?.status || 0);
    const message = String(error?.message || '').toLowerCase();
    const raw = String(error?.rawError || '').toLowerCase();
    return status === 503
      || message.includes('storage não configurado')
      || message.includes('storage nao configurado')
      || raw.includes('storage não configurado')
      || raw.includes('storage nao configurado');
  };

  const pickAndUpload = async ({ roomTypeId, businessId, accessToken, currentCount = 0 }) => {
    if (!roomTypeId || !businessId) {
      Alert.alert('Dados em falta', 'Não foi possível identificar o tipo de quarto para adicionar fotos.');
      return [];
    }

    if (!accessToken) {
      Alert.alert('Sessão inválida', 'Entre novamente para continuar a carregar fotos.');
      return [];
    }

    const remaining = 10 - currentCount;
    if (remaining <= 0) {
      Alert.alert('Limite atingido', 'Máximo de 10 fotos por tipo de quarto.');
      return [];
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permissão necessária', 'Activa o acesso à galeria nas definições.');
      return [];
    }

    let result;
    try {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
    } catch (error) {
      Alert.alert('Erro ao abrir galeria', 'Não foi possível abrir a galeria neste dispositivo.');
      return [];
    }

    if (result.canceled || !result.assets?.length) return [];

    setUploading(true);
    setProgress(0);
    const uploadedUrls = [];

    try {
      for (let i = 0; i < result.assets.slice(0, remaining).length; i++) {
        const asset = result.assets[i];
        const totalAssets = Math.min(result.assets.length, remaining);
        setProgress(i / totalAssets);

        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1280, height: 720 } }],
          { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG, base64: true },
        );

        const fileName = `room-${Date.now()}-${i}.jpg`;

        try {
          const { signedUrl, publicUrl } = await requestRoomPhotoSignedUrl({
            roomTypeId,
            businessId,
            fileName,
            accessToken,
          });

          const photoBlob = await fetch(compressed.uri).then((r) => r.blob());
          const uploadRes = await fetch(signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: photoBlob,
          });

          if (!uploadRes.ok) throw new Error(`Falha no upload da foto ${i + 1}.`);
          uploadedUrls.push(publicUrl);
        } catch (error) {
          if (isStorageUnavailable(error) && compressed?.base64) {
            try {
              const fallback = await backendApi.uploadRoomTypePhoto(
                roomTypeId,
                { fileName, mimeType: 'image/jpeg', base64: compressed.base64 },
                accessToken,
              );
              uploadedUrls.push(fallback.publicUrl);
              continue;
            } catch {
              // se o fallback também falhar, continua para o throw
            }
          }
          throw error;
        }
      }

      setProgress(1);
      return uploadedUrls;
    } catch (e) {
      Alert.alert('Erro no upload', e?.message || 'Tenta novamente.');
      return uploadedUrls;
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading, progress };
}
