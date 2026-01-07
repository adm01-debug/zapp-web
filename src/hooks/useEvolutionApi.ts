import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { log } from '@/lib/logger';

interface SendMessageParams {
  instanceName: string;
  number: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  caption?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
}

export function useEvolutionApi() {
  const [isLoading, setIsLoading] = useState(false);

  const callEvolutionApi = async (action: string, body?: object, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST') => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(`evolution-api/${action}`, {
        method,
        body,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log.error(`Evolution API error (${action}):`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createInstance = async (instanceName: string) => {
    try {
      const data = await callEvolutionApi('create-instance', { instanceName });
      toast.success('Instância criada com sucesso');
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar instância';
      toast.error(errorMessage);
    }
  };

  const connectInstance = async (instanceName: string) => {
    try {
      const data = await callEvolutionApi('connect', { instanceName });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar instância';
      toast.error(errorMessage);
      throw error;
    }
  };

  const getInstanceStatus = async (instanceName: string) => {
    try {
      const data = await callEvolutionApi('status', { instanceName });
      return data;
    } catch (error) {
      log.error('Status check error:', error);
      throw error;
    }
  };

  const sendTextMessage = async (instanceName: string, number: string, text: string) => {
    try {
      const data = await callEvolutionApi('send-text', { instanceName, number, text });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mensagem';
      toast.error(errorMessage);
      throw error;
    }
  };

  const sendMediaMessage = async (params: SendMessageParams) => {
    try {
      const data = await callEvolutionApi('send-media', params);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar mídia';
      toast.error(errorMessage);
    }
  };

  const sendAudioMessage = async (instanceName: string, number: string, mediaUrl: string) => {
    try {
      const data = await callEvolutionApi('send-audio', { instanceName, number, mediaUrl });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar áudio';
      toast.error(errorMessage);
      throw error;
    }
  };

  const sendLocationMessage = async (params: SendMessageParams) => {
    try {
      const data = await callEvolutionApi('send-location', params);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao enviar localização';
      toast.error(errorMessage);
    }
  };

  const listInstances = async () => {
    try {
      const data = await callEvolutionApi('list-instances', undefined, 'GET');
      return data;
    } catch (error) {
      log.error('List instances error:', error);
      throw error;
    }
  };

  const disconnectInstance = async (instanceName: string) => {
    try {
      const data = await callEvolutionApi('disconnect', { instanceName });
      toast.success('Instância desconectada');
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao desconectar';
      toast.error(errorMessage);
    }
  };

  const deleteInstance = async (instanceName: string) => {
    try {
      const data = await callEvolutionApi('delete-instance', { instanceName }, 'DELETE');
      toast.success('Instância excluída');
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir instância';
      toast.error(errorMessage);
    }
  };

  return {
    isLoading,
    createInstance,
    connectInstance,
    getInstanceStatus,
    sendTextMessage,
    sendMediaMessage,
    sendAudioMessage,
    sendLocationMessage,
    listInstances,
    disconnectInstance,
    deleteInstance,
  };
}
