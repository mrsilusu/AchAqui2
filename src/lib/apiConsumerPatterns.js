/**
 * ============================================================================
 * ACHAQUI - API CONSUMER INTEGRATION (Frontend → Backend)
 * ============================================================================
 * Este arquivo mostra como integrar chamadas à API dentro do OwnerModule
 * 
 * PADRÃO:
 *   1. Validar autenticação (accessToken + role)
 *   2. Preparar payload com validação
 *   3. Llamar API com try-catch
 *   4. Atualizar estado local em caso de sucesso
 *   5. Mostrar erro ao usuário em caso de falha
 * ============================================================================
 */

import { backendApi } from '../../lib/backendApi';
import { Alert } from 'react-native';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * 1. HELPER: Validar Owner & Token
 * ─────────────────────────────────────────────────────────────────────────
 */
export function validateOwnerAccess(accessToken, userId, businessOwnerId) {
  // Verificar autenticação
  if (!accessToken) {
    Alert.alert('Autenticação requerida', 'Faça login para editar seu negócio.');
    return false;
  }

  // Verificar propriedade do negócio
  if (userId !== businessOwnerId) {
    Alert.alert('Acesso negado', 'Você não pode editar este negócio.');
    return false;
  }

  return true;
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * 2. UPDATE BUSINESS STATUS (Aberto/Fechado)
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function handleUpdateBusinessStatus(
  businessId,
  isOpen,
  accessToken,
  onSuccess,
  onError
) {
  if (!businessId || !accessToken) {
    Alert.alert('Erro', 'Dados de negócio ou autenticação inválidos.');
    return;
  }

  try {
    // Chamada à API
    const response = await backendApi.updateBusinessStatus(
      businessId,
      { isOpen },
      accessToken
    );

    // Extrair dados da resposta
    const statusText = response.metadata?.statusText || (isOpen ? 'Aberto' : 'Fechado');
    const updatePayload = {
      isOpen: response.metadata?.isOpen ?? isOpen,
      statusText,
    };

    // Callback com sucesso
    if (typeof onSuccess === 'function') {
      onSuccess(updatePayload);
    }

    // Notificar usuário
    Alert.alert(
      'Sucesso',
      `Negócio marcado como ${isOpen ? 'aberto' : 'fechado'}.`
    );

    return response;
  } catch (error) {
    console.error('[UpdateStatus][ERROR]', {
      businessId,
      status: error?.status,
      message: error?.message,
    });

    // Callback com erro
    if (typeof onError === 'function') {
      onError(error);
    }

    // Notificar usuário
    const errorMsg = error?.message || 'Não foi possível atualizar o status.';
    Alert.alert('Erro ao atualizar', errorMsg);

    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * 3. UPDATE BUSINESS INFO (Informações gerais)
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function handleUpdateBusinessInfo(
  businessId,
  updateData,
  accessToken,
  onSuccess,
  onError
) {
  if (!businessId || !accessToken) {
    Alert.alert('Erro', 'Dados de negócio ou autenticação inválidos.');
    return;
  }

  // Validação básica
  const payload = {};
  
  if (updateData.name && updateData.name.length >= 2) {
    payload.name = updateData.name;
  }
  
  if (updateData.description && updateData.description.length >= 5) {
    payload.description = updateData.description;
  }
  
  if (updateData.phone) {
    payload.phone = updateData.phone;
  }
  
  if (updateData.email) {
    payload.email = updateData.email;
  }
  
  if (updateData.address) {
    payload.address = updateData.address;
  }
  
  if (updateData.website) {
    payload.website = updateData.website;
  }
  
  if (typeof updateData.latitude === 'number' && typeof updateData.longitude === 'number') {
    payload.latitude = updateData.latitude;
    payload.longitude = updateData.longitude;
  }

  if (Object.keys(payload).length === 0) {
    Alert.alert('Validação', 'Nenhum campo válido para atualizar.');
    return;
  }

  try {
    // Chamada à API
    const response = await backendApi.updateBusinessInfo(
      businessId,
      payload,
      accessToken
    );

    // Callback com sucesso
    if (typeof onSuccess === 'function') {
      onSuccess(payload);
    }

    Alert.alert('Sucesso', 'Informações atualizadas com sucesso!');

    return response;
  } catch (error) {
    console.error('[UpdateInfo][ERROR]', {
      businessId,
      payload,
      status: error?.status,
      message: error?.message,
    });

    // Callback com erro
    if (typeof onError === 'function') {
      onError(error);
    }

    const errorMsg = error?.message || 'Não foi possível atualizar as informações.';
    Alert.alert('Erro', errorMsg);

    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * 4. CREATE BOOKING (Cliente faz reserva)
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function handleCreateBooking(
  businessId,
  bookingData,
  accessToken,
  onSuccess,
  onError
) {
  // Validação
  if (!businessId || !bookingData.startDate || !bookingData.endDate) {
    Alert.alert('Validação', 'Dados da reserva incompletos.');
    return;
  }

  if (new Date(bookingData.startDate) >= new Date(bookingData.endDate)) {
    Alert.alert('Validação', 'A data de saída deve ser após a data de entrada.');
    return;
  }

  try {
    const payload = {
      businessId,
      startDate: bookingData.startDate,
      endDate: bookingData.endDate,
      ...(bookingData.notes && { notes: bookingData.notes }),
    };

    // Chamada à API
    const response = await backendApi.createBooking(
      payload,
      accessToken
    );

    // Callback com sucesso
    if (typeof onSuccess === 'function') {
      onSuccess(response);
    }

    Alert.alert('Sucesso', 'Reserva criada! Aguarde confirmação do proprietário.');

    return response;
  } catch (error) {
    console.error('[CreateBooking][ERROR]', {
      businessId,
      status: error?.status,
      message: error?.message,
    });

    // Callback com erro
    if (typeof onError === 'function') {
      onError(error);
    }

    const errorMsg = error?.message || 'Não foi possível criar a reserva.';
    Alert.alert('Erro', errorMsg);

    throw error;
  }
}

/**
 * ─────────────────────────────────────────────────────────────────────────
 * 5. PADRÃO DE USO NO OWNERMODULE
 * ─────────────────────────────────────────────────────────────────────────
 */

// Exemplo de implementação dentro de um useCallback:
export const createExampleOwnerHooks = (authContext) => {
  const { accessToken, userId, ownerBusinessId } = authContext;

  const setBusinessOpenAPI = useCallback(async (isOpen) => {
    if (!validateOwnerAccess(accessToken, userId, authContext.businessOwnerId)) {
      return;
    }

    setLoading(true);
    try {
      const result = await handleUpdateBusinessStatus(
        ownerBusinessId,
        isOpen,
        accessToken,
        (updatePayload) => {
          // Sucesso: atualizar estado local
          onUpdateBusiness(updatePayload);
        },
        (error) => {
          // Erro: logar e potencialmente fazer retry
          console.error('Falha em setBusinessOpen:', error);
        }
      );

      return result;
    } finally {
      setLoading(false);
    }
  }, [accessToken, userId, ownerBusinessId, authContext.businessOwnerId, onUpdateBusiness]);

  const saveBusinessInfoAPI = useCallback(async (editFields) => {
    if (!validateOwnerAccess(accessToken, userId, authContext.businessOwnerId)) {
      return;
    }

    setLoading(true);
    try {
      const result = await handleUpdateBusinessInfo(
        ownerBusinessId,
        editFields,
        accessToken,
        (updatePayload) => {
          // Sucesso: atualizar estado local
          onUpdateBusiness(updatePayload);
        },
        (error) => {
          console.error('Falha em saveBusinessInfo:', error);
        }
      );

      return result;
    } finally {
      setLoading(false);
    }
  }, [accessToken, userId, ownerBusinessId, authContext.businessOwnerId, onUpdateBusiness]);

  return { setBusinessOpenAPI, saveBusinessInfoAPI };
};

/**
 * ─────────────────────────────────────────────────────────────────────────
 * 6. RETRY LOGIC (Para melhorar resiliência)
 * ─────────────────────────────────────────────────────────────────────────
 */
export async function apiCallWithRetry(
  apiFunction,
  maxRetries = 3,
  delayMs = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error; // Última tentativa falhou
      }

      if (error?.type === 'network') {
        // Só fazer retry em erros de rede
        console.log(`[RETRY] Tentativa ${attempt}/${maxRetries} falhada, tentando novamente em ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      } else {
        // Erros de validação não devem ser retried
        throw error;
      }
    }
  }
}

// Uso:
// const response = await apiCallWithRetry(
//   () => backendApi.updateBusinessStatus(businessId, { isOpen }, accessToken),
//   3,
//   1000
// );

/**
 * ─────────────────────────────────────────────────────────────────────────
 * 7. CACHE MANAGER (Para offline support)
 * ─────────────────────────────────────────────────────────────────────────
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export class OfflineCacheManager {
  static async savePendingUpdate(businessId, updateKey, updateValue) {
    try {
      const key = `pending_update_${businessId}_${updateKey}`;
      await AsyncStorage.setItem(key, JSON.stringify({
        businessId,
        updateKey,
        updateValue,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('[CacheManager][SAVE_ERROR]', error);
    }
  }

  static async getPendingUpdates(businessId) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pendingKeys = keys.filter(k => k.startsWith(`pending_update_${businessId}_`));
      const updates = [];

      for (const key of pendingKeys) {
        const data = await AsyncStorage.getItem(key);
        updates.push(JSON.parse(data));
      }

      return updates;
    } catch (error) {
      console.error('[CacheManager][GET_ERROR]', error);
      return [];
    }
  }

  static async clearPendingUpdate(businessId, updateKey) {
    try {
      const key = `pending_update_${businessId}_${updateKey}`;
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('[CacheManager][CLEAR_ERROR]', error);
    }
  }

  static async syncPendingUpdates(businessId, accessToken) {
    const updates = await this.getPendingUpdates(businessId);

    for (const update of updates) {
      try {
        if (update.updateKey === 'status') {
          await backendApi.updateBusinessStatus(
            businessId,
            { isOpen: update.updateValue },
            accessToken
          );
        } else if (update.updateKey.startsWith('info_')) {
          const infoKey = update.updateKey.replace('info_', '');
          await backendApi.updateBusinessInfo(
            businessId,
            { [infoKey]: update.updateValue },
            accessToken
          );
        }

        await this.clearPendingUpdate(businessId, update.updateKey);
      } catch (error) {
        console.error('[CacheManager][SYNC_ERROR]', error);
      }
    }
  }
}

// Uso:
// if (isOffline) {
//   await OfflineCacheManager.savePendingUpdate(businessId, 'status', true);
//   updateUIOptimistically(businessId, { isOpen: true });
// } else {
//   await handleUpdateBusinessStatus(...);
// }

// Quando voltar online:
// await OfflineCacheManager.syncPendingUpdates(businessId, accessToken);
