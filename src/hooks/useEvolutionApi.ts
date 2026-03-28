import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { log } from '@/lib/logger';

// ============================================================
// EVOLUTION API v2 — FULL REACT HOOK (60+ actions)
// ============================================================

interface SendMessageParams {
  instanceName: string;
  number: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document';
  mimetype?: string;
  caption?: string;
  fileName?: string;
  delay?: number;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  quoted?: {
    key: { remoteJid: string; fromMe: boolean; id: string };
    message: { conversation: string };
  };
  mentionsEveryOne?: boolean;
  mentioned?: string[];
}

interface GroupParams {
  instanceName: string;
  groupJid: string;
  subject?: string;
  description?: string;
  participants?: string[];
  action?: 'add' | 'remove' | 'promote' | 'demote';
  image?: string;
  expiration?: number;
  inviteCode?: string;
}

interface ContactCard {
  fullName: string;
  wuid: string;
  phoneNumber: string;
  organization?: string;
  email?: string;
  url?: string;
}

interface PollParams {
  instanceName: string;
  number: string;
  name: string;
  selectableCount?: number;
  values: string[];
}

interface ListSection {
  title: string;
  rows: { title: string; description?: string; rowId: string }[];
}

interface ButtonItem {
  type: 'reply';
  displayText: string;
  id: string;
}

interface WebhookConfig {
  instanceName: string;
  enabled?: boolean;
  url: string;
  webhookByEvents?: boolean;
  webhookBase64?: boolean;
  events?: string[];
}

interface SettingsConfig {
  instanceName: string;
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
}

interface PrivacySettings {
  instanceName: string;
  readreceipts?: string;
  profile?: string;
  status?: string;
  online?: string;
  last?: string;
  groupadd?: string;
}

interface TypebotConfig {
  instanceName: string;
  enabled?: boolean;
  url: string;
  typebot: string;
  expire?: number;
  keywordFinish?: string;
  delayMessage?: number;
  unknownMessage?: string;
  listeningFromMe?: boolean;
  stopBotFromMe?: boolean;
  keepOpen?: boolean;
  debounceTime?: number;
  triggerType?: string;
  triggerOperator?: string;
  triggerValue?: string;
}

interface OpenAIConfig {
  instanceName: string;
  enabled?: boolean;
  openAiApiKey: string;
  expire?: number;
  keywordFinish?: string;
  delayMessage?: number;
  listeningFromMe?: boolean;
  stopBotFromMe?: boolean;
  speechToText?: boolean;
  botType?: 'chatCompletion' | 'assistant';
  assistantId?: string;
  model?: string;
  systemMessage?: string;
  maxTokens?: number;
  temperature?: number;
  triggerType?: string;
  triggerOperator?: string;
  triggerValue?: string;
  functionUrl?: string;
}

interface DifyConfig {
  instanceName: string;
  enabled?: boolean;
  apiUrl: string;
  apiKey: string;
  botType?: 'chatBot' | 'textGenerator' | 'agent' | 'workflow';
  expire?: number;
  triggerType?: string;
  keywordFinish?: string;
  listeningFromMe?: boolean;
  stopBotFromMe?: boolean;
  speechToText?: boolean;
}

interface FlowiseConfig {
  instanceName: string;
  enabled?: boolean;
  apiUrl: string;
  apiKey?: string;
  chatflowId: string;
  expire?: number;
  triggerType?: string;
  triggerValue?: string;
}

interface EvolutionBotConfig {
  instanceName: string;
  enabled?: boolean;
  expire?: number;
  keywordFinish?: string;
  delayMessage?: number;
  triggerType?: string;
  triggerOperator?: string;
  triggerValue?: string;
  unknownMessage?: string;
  listeningFromMe?: boolean;
  stopBotFromMe?: boolean;
  apiUrl: string;
  apiKey?: string;
}

interface ChatwootConfig {
  instanceName: string;
  enabled?: boolean;
  accountId: string;
  token: string;
  url: string;
  signMsg?: boolean;
  reopenConversation?: boolean;
  conversationPending?: boolean;
  nameInbox?: string;
  mergeBrazilContacts?: boolean;
  importContacts?: boolean;
  importMessages?: boolean;
  daysLimitImportMessages?: number;
  signDelimiter?: string;
  autoCreate?: boolean;
}

interface CreateInstanceParams {
  instanceName: string;
  qrcode?: boolean;
  integration?: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS-CLOUD';
  token?: string;
  number?: string;
  businessId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  webhook?: Partial<WebhookConfig>;
  chatwoot?: Partial<ChatwootConfig>;
  typebot?: Partial<TypebotConfig>;
}

export function useEvolutionApi() {
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);
  const inflightRef = useRef<Map<string, Promise<any>>>(new Map());

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const callApi = useCallback(async (action: string, body?: object, method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST') => {
    // Dedup identical GET requests in-flight
    const dedupeKey = method === 'GET' ? `${action}:${JSON.stringify(body || {})}` : '';
    if (dedupeKey && inflightRef.current.has(dedupeKey)) {
      return inflightRef.current.get(dedupeKey);
    }

    if (mountedRef.current) setIsLoading(true);

    const promise = (async () => {
      try {
        // Always use POST to the edge function — the edge function itself maps
        // to the correct HTTP method when calling the Evolution API.
        // Browsers reject GET/HEAD requests that carry a body.
        const { data, error } = await supabase.functions.invoke(`evolution-api/${action}`, {
          method: 'POST',
          body: body ?? {},
        });
        if (error) throw error;
        // Check for wrapped API errors (edge function returns 200 with error field)
        if (data && typeof data === 'object' && data.error === true) {
          const apiError = new Error(data.message || 'Erro na API Evolution');
          (apiError as any).details = data.details;
          (apiError as any).apiStatus = data.status;
          (apiError as any).retries = data.retries;
          throw apiError;
        }
        return data;
      } catch (error) {
        log.error(`Evolution API error (${action}):`, error);
        throw error;
      } finally {
        if (dedupeKey) inflightRef.current.delete(dedupeKey);
        if (mountedRef.current) setIsLoading(false);
      }
    })();

    if (dedupeKey) inflightRef.current.set(dedupeKey, promise);
    return promise;
  }, []);

  // Helper for toast feedback
  const withToast = useCallback(async (
    action: string,
    body: object | undefined,
    successMsg: string,
    errorMsg: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
  ) => {
    try {
      const data = await callApi(action, body, method);
      toast.success(successMsg);
      return data;
    } catch (error) {
      const msg = error instanceof Error ? error.message : errorMsg;
      toast.error(msg);
      throw error;
    }
  }, [callApi]);

  // =============================================
  // 1. INSTANCE MANAGEMENT
  // =============================================

  const createInstance = useCallback(async (params: CreateInstanceParams) => {
    return withToast('create-instance', params, 'Instância criada com sucesso', 'Erro ao criar instância');
  }, [withToast]);

  const listInstances = useCallback(async (instanceName?: string) => {
    return callApi('list-instances', instanceName ? { instanceName } : undefined, 'GET');
  }, [callApi]);

  const connectInstance = useCallback(async (instanceName: string) => {
    return callApi('connect', { instanceName });
  }, [callApi]);

  const getInstanceStatus = useCallback(async (instanceName: string) => {
    return callApi('status', { instanceName });
  }, [callApi]);

  const getInstanceInfo = useCallback(async (instanceName: string) => {
    return callApi('instance-info', { instanceName }, 'GET');
  }, [callApi]);

  const restartInstance = useCallback(async (instanceName: string) => {
    return withToast('restart-instance', { instanceName }, 'Instância reiniciada', 'Erro ao reiniciar');
  }, [withToast]);

  const disconnectInstance = useCallback(async (instanceName: string) => {
    return withToast('disconnect', { instanceName }, 'Instância desconectada', 'Erro ao desconectar');
  }, [withToast]);

  const deleteInstance = useCallback(async (instanceName: string) => {
    return withToast('delete-instance', { instanceName }, 'Instância excluída', 'Erro ao excluir instância', 'DELETE');
  }, [withToast]);

  const setPresence = useCallback(async (instanceName: string, presence: 'available' | 'unavailable' | 'composing' | 'recording' | 'paused') => {
    return callApi('set-presence', { instanceName, presence });
  }, [callApi]);

  // =============================================
  // 2. SETTINGS
  // =============================================

  const setSettings = useCallback(async (config: SettingsConfig) => {
    return withToast('set-settings', config, 'Configurações salvas', 'Erro ao salvar configurações');
  }, [withToast]);

  const getSettings = useCallback(async (instanceName: string) => {
    return callApi('get-settings', { instanceName }, 'GET');
  }, [callApi]);

  // =============================================
  // 3. WEBHOOK MANAGEMENT
  // =============================================

  const setWebhook = useCallback(async (config: WebhookConfig) => {
    return withToast('set-webhook', config, 'Webhook configurado', 'Erro ao configurar webhook');
  }, [withToast]);

  const getWebhook = useCallback(async (instanceName: string) => {
    return callApi('get-webhook', { instanceName }, 'GET');
  }, [callApi]);

  // =============================================
  // 4. MESSAGE SENDING
  // =============================================

  const sendTextMessage = useCallback(async (instanceName: string, number: string, text: string, options?: { delay?: number; quoted?: SendMessageParams['quoted']; mentioned?: string[] }) => {
    return callApi('send-text', { instanceName, number, text, ...options });
  }, [callApi]);

  const sendMediaMessage = useCallback(async (params: SendMessageParams) => {
    return callApi('send-media', params);
  }, [callApi]);

  const sendAudioMessage = useCallback(async (instanceName: string, number: string, mediaUrl: string, options?: { encoding?: boolean; delay?: number }) => {
    return callApi('send-audio', { instanceName, number, mediaUrl, ...options });
  }, [callApi]);

  const sendStickerMessage = useCallback(async (instanceName: string, number: string, sticker: string) => {
    return callApi('send-sticker', { instanceName, number, sticker });
  }, [callApi]);

  const sendLocationMessage = useCallback(async (params: SendMessageParams) => {
    return callApi('send-location', params);
  }, [callApi]);

  const sendContactMessage = useCallback(async (instanceName: string, number: string, contact: ContactCard[]) => {
    return callApi('send-contact', { instanceName, number, contact });
  }, [callApi]);

  const sendReaction = useCallback(async (instanceName: string, key: { remoteJid: string; fromMe: boolean; id: string }, reaction: string) => {
    return callApi('send-reaction', { instanceName, key, reaction });
  }, [callApi]);

  const sendPollMessage = useCallback(async (params: PollParams) => {
    return callApi('send-poll', params);
  }, [callApi]);

  const sendListMessage = useCallback(async (instanceName: string, number: string, title: string, description: string, buttonText: string, sections: ListSection[], footer?: string) => {
    return callApi('send-list', { instanceName, number, title, description, buttonText, sections, footer });
  }, [callApi]);

  const sendButtonsMessage = useCallback(async (instanceName: string, number: string, title: string, description: string, buttons: ButtonItem[], footer?: string) => {
    return callApi('send-buttons', { instanceName, number, title, description, buttons, footer });
  }, [callApi]);

  const sendStatusMessage = useCallback(async (instanceName: string, body: object) => {
    return callApi('send-status', { instanceName, ...body });
  }, [callApi]);

  const sendTemplateMessage = useCallback(async (instanceName: string, number: string, template: object) => {
    return callApi('send-template', { instanceName, number, template });
  }, [callApi]);

  // =============================================
  // 5. MESSAGE MANAGEMENT
  // =============================================

  const markMessageAsRead = useCallback(async (instanceName: string, key: object) => {
    return callApi('mark-read', { instanceName, key });
  }, [callApi]);

  const markMessageAsUnread = useCallback(async (instanceName: string, key: object) => {
    return callApi('mark-unread', { instanceName, key });
  }, [callApi]);

  const archiveChat = useCallback(async (instanceName: string, lastMessage: object, chat: string, archive: boolean = true) => {
    return callApi('archive-chat', { instanceName, lastMessage, chat, archive });
  }, [callApi]);

  const deleteMessage = useCallback(async (instanceName: string, id: string, remoteJid: string, fromMe: boolean) => {
    return callApi('delete-message', { instanceName, id, remoteJid, fromMe }, 'DELETE');
  }, [callApi]);

  const updateMessage = useCallback(async (instanceName: string, number: string, key: object, text: string) => {
    return callApi('update-message', { instanceName, number, key, text });
  }, [callApi]);

  // =============================================
  // 6. CHAT MANAGEMENT
  // =============================================

  const findChats = useCallback(async (instanceName: string, page?: number, offset?: number) => {
    return callApi('find-chats', { instanceName, page, offset }, 'GET');
  }, [callApi]);

  const findMessages = useCallback(async (instanceName: string, remoteJid: string, page?: number, offset?: number, timestampStart?: number, timestampEnd?: number) => {
    return callApi('find-messages', { instanceName, remoteJid, page, offset, timestampStart, timestampEnd }, 'GET');
  }, [callApi]);

  const findStatusMessages = useCallback(async (instanceName: string) => {
    return callApi('find-status-messages', { instanceName }, 'GET');
  }, [callApi]);

  const findContacts = useCallback(async (instanceName: string, page?: number, offset?: number) => {
    return callApi('find-contacts', { instanceName, page, offset }, 'GET');
  }, [callApi]);

  const checkWhatsAppNumbers = useCallback(async (instanceName: string, numbers: string[]) => {
    return callApi('check-numbers', { instanceName, numbers });
  }, [callApi]);

  const getMediaBase64 = useCallback(async (instanceName: string, message: object, convertToMp4?: boolean) => {
    return callApi('get-media-base64', { instanceName, message, convertToMp4 });
  }, [callApi]);

  const deleteMessageForEveryone = useCallback(async (instanceName: string, body: object) => {
    return callApi('delete-for-everyone', { instanceName, ...body }, 'DELETE');
  }, [callApi]);

  const editMessage = useCallback(async (instanceName: string, body: object) => {
    return callApi('edit-message', { instanceName, ...body });
  }, [callApi]);

  // =============================================
  // 7. GROUP MANAGEMENT
  // =============================================

  const createGroup = useCallback(async (instanceName: string, subject: string, description: string, participants: string[]) => {
    return withToast('create-group', { instanceName, subject, description, participants }, 'Grupo criado', 'Erro ao criar grupo');
  }, [withToast]);

  const listGroups = useCallback(async (instanceName: string) => {
    return callApi('list-groups', { instanceName }, 'GET');
  }, [callApi]);

  const getGroupInfo = useCallback(async (instanceName: string, groupJid: string) => {
    return callApi('group-info', { instanceName, groupJid }, 'GET');
  }, [callApi]);

  const getGroupParticipants = useCallback(async (instanceName: string, groupJid: string) => {
    return callApi('group-participants', { instanceName, groupJid }, 'GET');
  }, [callApi]);

  const updateGroupName = useCallback(async (instanceName: string, groupJid: string, subject: string) => {
    return withToast('update-group-name', { instanceName, groupJid, subject }, 'Nome do grupo atualizado', 'Erro ao atualizar nome');
  }, [withToast]);

  const updateGroupDescription = useCallback(async (instanceName: string, groupJid: string, description: string) => {
    return withToast('update-group-description', { instanceName, groupJid, description }, 'Descrição atualizada', 'Erro ao atualizar descrição');
  }, [withToast]);

  const updateGroupParticipants = useCallback(async (instanceName: string, groupJid: string, action: 'add' | 'remove' | 'promote' | 'demote', participants: string[]) => {
    return withToast('update-participants', { instanceName, groupJid, action, participants }, 'Participantes atualizados', 'Erro ao atualizar participantes');
  }, [withToast]);

  const updateGroupSetting = useCallback(async (instanceName: string, groupJid: string, action: 'announcement' | 'not_announcement' | 'locked' | 'unlocked') => {
    return withToast('update-group-setting', { instanceName, groupJid, action }, 'Configuração atualizada', 'Erro ao atualizar configuração');
  }, [withToast]);

  const getGroupInviteCode = useCallback(async (instanceName: string, groupJid: string) => {
    return callApi('group-invite-code', { instanceName, groupJid }, 'GET');
  }, [callApi]);

  const revokeGroupInviteCode = useCallback(async (instanceName: string, groupJid: string) => {
    return withToast('revoke-invite-code', { instanceName, groupJid }, 'Link revogado', 'Erro ao revogar link');
  }, [withToast]);

  const getInviteInfo = useCallback(async (instanceName: string, inviteCode: string) => {
    return callApi('invite-info', { instanceName, inviteCode }, 'GET');
  }, [callApi]);

  const acceptInvite = useCallback(async (instanceName: string, inviteCode: string) => {
    return withToast('accept-invite', { instanceName, inviteCode }, 'Entrou no grupo', 'Erro ao entrar no grupo');
  }, [withToast]);

  const leaveGroup = useCallback(async (instanceName: string, groupJid: string) => {
    return withToast('leave-group', { instanceName, groupJid }, 'Saiu do grupo', 'Erro ao sair do grupo', 'DELETE');
  }, [withToast]);

  const updateGroupPicture = useCallback(async (instanceName: string, groupJid: string, image: string) => {
    return withToast('update-group-picture', { instanceName, groupJid, image }, 'Foto atualizada', 'Erro ao atualizar foto');
  }, [withToast]);

  const toggleEphemeral = useCallback(async (instanceName: string, groupJid: string, expiration: number) => {
    return callApi('toggle-ephemeral', { instanceName, groupJid, expiration });
  }, [callApi]);

  // =============================================
  // 8. PROFILE MANAGEMENT
  // =============================================

  const fetchProfile = useCallback(async (instanceName: string) => {
    return callApi('fetch-profile', { instanceName }, 'GET');
  }, [callApi]);

  const updateProfileName = useCallback(async (instanceName: string, name: string) => {
    return withToast('update-profile-name', { instanceName, name }, 'Nome atualizado', 'Erro ao atualizar nome');
  }, [withToast]);

  const updateProfileStatus = useCallback(async (instanceName: string, status: string) => {
    return withToast('update-profile-status', { instanceName, status }, 'Status atualizado', 'Erro ao atualizar status');
  }, [withToast]);

  const updateProfilePicture = useCallback(async (instanceName: string, picture: string) => {
    return withToast('update-profile-picture', { instanceName, picture }, 'Foto atualizada', 'Erro ao atualizar foto');
  }, [withToast]);

  const removeProfilePicture = useCallback(async (instanceName: string) => {
    return withToast('remove-profile-picture', { instanceName }, 'Foto removida', 'Erro ao remover foto', 'DELETE');
  }, [withToast]);

  const fetchProfilePicture = useCallback(async (instanceName: string, number: string) => {
    return callApi('fetch-profile-picture', { instanceName, number }, 'GET');
  }, [callApi]);

  const fetchBusinessProfile = useCallback(async (instanceName: string, number: string) => {
    return callApi('fetch-business-profile', { instanceName, number });
  }, [callApi]);

  const updatePrivacySettings = useCallback(async (settings: PrivacySettings) => {
    return withToast('update-privacy', settings, 'Privacidade atualizada', 'Erro ao atualizar privacidade');
  }, [withToast]);

  // =============================================
  // 9. LABELS
  // =============================================

  const findLabels = useCallback(async (instanceName: string) => {
    return callApi('find-labels', { instanceName }, 'GET');
  }, [callApi]);

  const handleLabel = useCallback(async (instanceName: string, number: string, labelId: string, action: 'add' | 'remove') => {
    return callApi('handle-label', { instanceName, number, labelId, action });
  }, [callApi]);

  // =============================================
  // 10. CHATWOOT INTEGRATION
  // =============================================

  const setChatwoot = useCallback(async (config: ChatwootConfig) => {
    return withToast('set-chatwoot', config, 'Chatwoot configurado', 'Erro ao configurar Chatwoot');
  }, [withToast]);

  const getChatwoot = useCallback(async (instanceName: string) => {
    return callApi('get-chatwoot', { instanceName }, 'GET');
  }, [callApi]);

  const deleteChatwoot = useCallback(async (instanceName: string) => {
    return withToast('delete-chatwoot', { instanceName }, 'Chatwoot removido', 'Erro ao remover Chatwoot', 'DELETE');
  }, [withToast]);

  // =============================================
  // 11. TYPEBOT INTEGRATION
  // =============================================

  const setTypebot = useCallback(async (config: TypebotConfig) => {
    return withToast('set-typebot', config, 'Typebot configurado', 'Erro ao configurar Typebot');
  }, [withToast]);

  const getTypebot = useCallback(async (instanceName: string) => {
    return callApi('get-typebot', { instanceName }, 'GET');
  }, [callApi]);

  const deleteTypebot = useCallback(async (instanceName: string) => {
    return withToast('delete-typebot', { instanceName }, 'Typebot removido', 'Erro ao remover Typebot', 'DELETE');
  }, [withToast]);

  const getTypebotSessions = useCallback(async (instanceName: string, typebotId?: string) => {
    return callApi('typebot-sessions', { instanceName, typebotId }, 'GET');
  }, [callApi]);

  const changeTypebotStatus = useCallback(async (instanceName: string, remoteJid: string, status: 'opened' | 'paused' | 'closed') => {
    return callApi('typebot-change-status', { instanceName, remoteJid, status });
  }, [callApi]);

  const startTypebot = useCallback(async (instanceName: string, remoteJid: string, url: string, typebot: string, variables?: object) => {
    return callApi('start-typebot', { instanceName, remoteJid, url, typebot, variables });
  }, [callApi]);

  // =============================================
  // 12. OPENAI INTEGRATION
  // =============================================

  const setOpenAI = useCallback(async (config: OpenAIConfig) => {
    return withToast('set-openai', config, 'OpenAI configurado', 'Erro ao configurar OpenAI');
  }, [withToast]);

  const getOpenAI = useCallback(async (instanceName: string) => {
    return callApi('get-openai', { instanceName }, 'GET');
  }, [callApi]);

  const deleteOpenAI = useCallback(async (instanceName: string) => {
    return withToast('delete-openai', { instanceName }, 'OpenAI removido', 'Erro ao remover OpenAI', 'DELETE');
  }, [withToast]);

  // =============================================
  // 13. DIFY INTEGRATION
  // =============================================

  const setDify = useCallback(async (config: DifyConfig) => {
    return withToast('set-dify', config, 'Dify configurado', 'Erro ao configurar Dify');
  }, [withToast]);

  const getDify = useCallback(async (instanceName: string) => {
    return callApi('get-dify', { instanceName }, 'GET');
  }, [callApi]);

  const deleteDify = useCallback(async (instanceName: string) => {
    return withToast('delete-dify', { instanceName }, 'Dify removido', 'Erro ao remover Dify', 'DELETE');
  }, [withToast]);

  // =============================================
  // 14. FLOWISE INTEGRATION
  // =============================================

  const setFlowise = useCallback(async (config: FlowiseConfig) => {
    return withToast('set-flowise', config, 'Flowise configurado', 'Erro ao configurar Flowise');
  }, [withToast]);

  const getFlowise = useCallback(async (instanceName: string) => {
    return callApi('get-flowise', { instanceName }, 'GET');
  }, [callApi]);

  const deleteFlowise = useCallback(async (instanceName: string) => {
    return withToast('delete-flowise', { instanceName }, 'Flowise removido', 'Erro ao remover Flowise', 'DELETE');
  }, [withToast]);

  // =============================================
  // 15. EVOLUTION BOT INTEGRATION
  // =============================================

  const setEvolutionBot = useCallback(async (config: EvolutionBotConfig) => {
    return withToast('set-evolution-bot', config, 'Evolution Bot configurado', 'Erro ao configurar Evolution Bot');
  }, [withToast]);

  const getEvolutionBot = useCallback(async (instanceName: string) => {
    return callApi('get-evolution-bot', { instanceName }, 'GET');
  }, [callApi]);

  const deleteEvolutionBot = useCallback(async (instanceName: string) => {
    return withToast('delete-evolution-bot', { instanceName }, 'Evolution Bot removido', 'Erro ao remover Evolution Bot', 'DELETE');
  }, [withToast]);

  // =============================================
  // 16. RABBITMQ / SQS
  // =============================================

  const setRabbitMQ = useCallback(async (instanceName: string, enabled: boolean, events?: string[]) => {
    return callApi('set-rabbitmq', { instanceName, enabled, events });
  }, [callApi]);

  const getRabbitMQ = useCallback(async (instanceName: string) => {
    return callApi('get-rabbitmq', { instanceName }, 'GET');
  }, [callApi]);

  const setSQS = useCallback(async (instanceName: string, enabled: boolean, events?: string[]) => {
    return callApi('set-sqs', { instanceName, enabled, events });
  }, [callApi]);

  const getSQS = useCallback(async (instanceName: string) => {
    return callApi('get-sqs', { instanceName }, 'GET');
  }, [callApi]);

  // =============================================
  // 17. TEMPLATE MANAGEMENT (Cloud API)
  // =============================================

  const createTemplate = useCallback(async (instanceName: string, templateData: object) => {
    return withToast('create-template', { instanceName, ...templateData }, 'Template criado', 'Erro ao criar template');
  }, [withToast]);

  const findTemplates = useCallback(async (instanceName: string) => {
    return callApi('find-templates', { instanceName }, 'GET');
  }, [callApi]);

  const deleteTemplate = useCallback(async (instanceName: string, templateData: object) => {
    return withToast('delete-template', { instanceName, ...templateData }, 'Template excluído', 'Erro ao excluir template', 'DELETE');
  }, [withToast]);

  // =============================================
  // 18. BLOCK/UNBLOCK CONTACTS
  // =============================================

  const updateBlockStatus = useCallback(async (instanceName: string, number: string, status: 'block' | 'unblock') => {
    return withToast('update-block-status', { instanceName, number, status },
      status === 'block' ? 'Contato bloqueado' : 'Contato desbloqueado',
      'Erro ao atualizar bloqueio');
  }, [withToast]);

  // =============================================
  // 19. SEND PTV (Video Note)
  // =============================================

  const sendPtvMessage = useCallback(async (instanceName: string, number: string, video: string, delay?: number) => {
    return callApi('send-ptv', { instanceName, number, video, delay });
  }, [callApi]);

  // =============================================
  // 20. OFFER CALL
  // =============================================

  const offerCall = useCallback(async (instanceName: string, number: string, isVideo?: boolean, callDuration?: number) => {
    return callApi('offer-call', { instanceName, number, isVideo, callDuration });
  }, [callApi]);

  // =============================================
  // 21. SEND CHAT PRESENCE (per chat)
  // =============================================

  const sendChatPresence = useCallback(async (instanceName: string, number: string, presence: 'composing' | 'recording' | 'paused', delay?: number) => {
    return callApi('send-chat-presence', { instanceName, number, presence, delay });
  }, [callApi]);

  // =============================================
  // 22. BUSINESS CATALOG & COLLECTIONS
  // =============================================

  const getBusinessCatalog = useCallback(async (instanceName: string, number: string, limit?: number, cursor?: string) => {
    return callApi('get-catalog', { instanceName, number, limit, cursor });
  }, [callApi]);

  const getBusinessCollections = useCallback(async (instanceName: string, number: string, limit?: number, cursor?: string) => {
    return callApi('get-collections', { instanceName, number, limit, cursor });
  }, [callApi]);

  // =============================================
  // 23. PROXY CONFIGURATION
  // =============================================

  const setProxy = useCallback(async (instanceName: string, config: { enabled?: boolean; host: string; port: number; protocol: string; username?: string; password?: string }) => {
    return withToast('set-proxy', { instanceName, ...config }, 'Proxy configurado', 'Erro ao configurar proxy');
  }, [withToast]);

  const getProxy = useCallback(async (instanceName: string) => {
    return callApi('get-proxy', { instanceName }, 'GET');
  }, [callApi]);

  // =============================================
  // 24. EVO AI INTEGRATION
  // =============================================

  const setEvoAI = useCallback(async (instanceName: string, config: { enabled?: boolean; apiUrl: string; apiKey: string; agentId: string; expire?: number; triggerType?: string; triggerOperator?: string; triggerValue?: string; keywordFinish?: string; delayMessage?: number; unknownMessage?: string; listeningFromMe?: boolean; stopBotFromMe?: boolean; keepOpen?: boolean; debounceTime?: number; speechToText?: boolean }) => {
    return withToast('set-evoai', { instanceName, ...config }, 'EvoAI configurado', 'Erro ao configurar EvoAI');
  }, [withToast]);

  const getEvoAI = useCallback(async (instanceName: string) => {
    return callApi('get-evoai', { instanceName }, 'GET');
  }, [callApi]);

  const deleteEvoAI = useCallback(async (instanceName: string) => {
    return withToast('delete-evoai', { instanceName }, 'EvoAI removido', 'Erro ao remover EvoAI', 'DELETE');
  }, [withToast]);

  // =============================================
  // 25. N8N INTEGRATION
  // =============================================

  const setN8N = useCallback(async (instanceName: string, config: { enabled?: boolean; webhookUrl: string; expire?: number; triggerType?: string; triggerOperator?: string; triggerValue?: string; keywordFinish?: string; delayMessage?: number; unknownMessage?: string; listeningFromMe?: boolean; stopBotFromMe?: boolean; keepOpen?: boolean; debounceTime?: number }) => {
    return withToast('set-n8n', { instanceName, ...config }, 'N8N configurado', 'Erro ao configurar N8N');
  }, [withToast]);

  const getN8N = useCallback(async (instanceName: string) => {
    return callApi('get-n8n', { instanceName }, 'GET');
  }, [callApi]);

  const deleteN8N = useCallback(async (instanceName: string) => {
    return withToast('delete-n8n', { instanceName }, 'N8N removido', 'Erro ao remover N8N', 'DELETE');
  }, [withToast]);

  // =============================================
  // 26. EVENT STREAMING (Kafka, NATS, Pusher)
  // =============================================

  const setKafka = useCallback(async (instanceName: string, enabled: boolean, events?: string[]) => {
    return callApi('set-kafka', { instanceName, enabled, events });
  }, [callApi]);

  const getKafka = useCallback(async (instanceName: string) => {
    return callApi('get-kafka', { instanceName }, 'GET');
  }, [callApi]);

  const setNats = useCallback(async (instanceName: string, enabled: boolean, events?: string[]) => {
    return callApi('set-nats', { instanceName, enabled, events });
  }, [callApi]);

  const getNats = useCallback(async (instanceName: string) => {
    return callApi('get-nats', { instanceName }, 'GET');
  }, [callApi]);

  const setPusher = useCallback(async (instanceName: string, config: { enabled?: boolean; appId: string; key: string; secret: string; cluster: string; events?: string[] }) => {
    return callApi('set-pusher', { instanceName, ...config });
  }, [callApi]);

  const getPusher = useCallback(async (instanceName: string) => {
    return callApi('get-pusher', { instanceName }, 'GET');
  }, [callApi]);

  return {
    isLoading,

    // Instance Management
    createInstance,
    listInstances,
    connectInstance,
    getInstanceStatus,
    getInstanceInfo,
    restartInstance,
    disconnectInstance,
    deleteInstance,
    setPresence,

    // Settings
    setSettings,
    getSettings,

    // Webhooks
    setWebhook,
    getWebhook,

    // Message Sending
    sendTextMessage,
    sendMediaMessage,
    sendAudioMessage,
    sendStickerMessage,
    sendLocationMessage,
    sendContactMessage,
    sendReaction,
    sendPollMessage,
    sendListMessage,
    sendButtonsMessage,
    sendStatusMessage,
    sendTemplateMessage,

    // Message Management
    markMessageAsRead,
    markMessageAsUnread,
    archiveChat,
    deleteMessage,
    updateMessage,

    // Chat Management
    findChats,
    findMessages,
    findStatusMessages,
    findContacts,
    checkWhatsAppNumbers,
    getMediaBase64,
    deleteMessageForEveryone,
    editMessage,

    // Group Management
    createGroup,
    listGroups,
    getGroupInfo,
    getGroupParticipants,
    updateGroupName,
    updateGroupDescription,
    updateGroupParticipants,
    updateGroupSetting,
    getGroupInviteCode,
    revokeGroupInviteCode,
    getInviteInfo,
    acceptInvite,
    leaveGroup,
    updateGroupPicture,
    toggleEphemeral,

    // Profile Management
    fetchProfile,
    updateProfileName,
    updateProfileStatus,
    updateProfilePicture,
    removeProfilePicture,
    fetchProfilePicture,
    fetchBusinessProfile,
    updatePrivacySettings,

    // Labels
    findLabels,
    handleLabel,

    // Chatwoot
    setChatwoot,
    getChatwoot,
    deleteChatwoot,

    // Typebot
    setTypebot,
    getTypebot,
    deleteTypebot,
    getTypebotSessions,
    changeTypebotStatus,
    startTypebot,

    // OpenAI
    setOpenAI,
    getOpenAI,
    deleteOpenAI,

    // Dify
    setDify,
    getDify,
    deleteDify,

    // Flowise
    setFlowise,
    getFlowise,
    deleteFlowise,

    // Evolution Bot
    setEvolutionBot,
    getEvolutionBot,
    deleteEvolutionBot,

    // RabbitMQ / SQS
    setRabbitMQ,
    getRabbitMQ,
    setSQS,
    getSQS,

    // Templates (Cloud API)
    createTemplate,
    findTemplates,
    deleteTemplate,

    // Block/Unblock
    updateBlockStatus,

    // PTV (Video Note)
    sendPtvMessage,

    // Offer Call
    offerCall,

    // Chat Presence
    sendChatPresence,

    // Business Catalog & Collections
    getBusinessCatalog,
    getBusinessCollections,

    // Proxy
    setProxy,
    getProxy,

    // EvoAI
    setEvoAI,
    getEvoAI,
    deleteEvoAI,

    // N8N
    setN8N,
    getN8N,
    deleteN8N,

    // Event Streaming
    setKafka,
    getKafka,
    setNats,
    getNats,
    setPusher,
    getPusher,
  };
}
