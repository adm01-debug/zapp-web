import { useCallback } from 'react';
import type { HttpMethod } from './useEvolutionApiCore';
import type { SendMessageParams, ContactCard, PollParams, ListSection, ButtonItem } from '../evolutionApi.types';

export function useEvolutionMessaging(
  callApi: (action: string, body?: object, method?: HttpMethod) => Promise<any>,
  withToast: (action: string, body: object | undefined, successMsg: string, errorMsg: string, method?: HttpMethod) => Promise<any>
) {
  const sendTextMessage = useCallback((instanceName: string, number: string, text: string, options?: { delay?: number; quoted?: SendMessageParams['quoted']; mentioned?: string[] }) =>
    callApi('send-text', { instanceName, number, text, ...options }), [callApi]);

  const sendMediaMessage = useCallback((params: SendMessageParams) =>
    callApi('send-media', params), [callApi]);

  const sendAudioMessage = useCallback((instanceName: string, number: string, mediaUrl: string, options?: { encoding?: boolean; delay?: number }) =>
    callApi('send-audio', { instanceName, number, mediaUrl, ...options }), [callApi]);

  const sendStickerMessage = useCallback((instanceName: string, number: string, sticker: string) =>
    callApi('send-sticker', { instanceName, number, sticker }), [callApi]);

  const sendLocationMessage = useCallback((params: SendMessageParams) =>
    callApi('send-location', params), [callApi]);

  const sendContactMessage = useCallback((instanceName: string, number: string, contact: ContactCard[]) =>
    callApi('send-contact', { instanceName, number, contact }), [callApi]);

  const sendReaction = useCallback((instanceName: string, key: { remoteJid: string; fromMe: boolean; id: string }, reaction: string) =>
    callApi('send-reaction', { instanceName, key, reaction }), [callApi]);

  const sendPollMessage = useCallback((params: PollParams) =>
    callApi('send-poll', params), [callApi]);

  const sendListMessage = useCallback((instanceName: string, number: string, title: string, description: string, buttonText: string, sections: ListSection[], footer?: string) =>
    callApi('send-list', { instanceName, number, title, description, buttonText, sections, footer }), [callApi]);

  const sendButtonsMessage = useCallback((instanceName: string, number: string, title: string, description: string, buttons: ButtonItem[], footer?: string) =>
    callApi('send-buttons', { instanceName, number, title, description, buttons, footer }), [callApi]);

  const sendStatusMessage = useCallback((instanceName: string, body: object) =>
    callApi('send-status', { instanceName, ...body }), [callApi]);

  const sendTemplateMessage = useCallback((instanceName: string, number: string, template: object) =>
    callApi('send-template', { instanceName, number, template }), [callApi]);

  const sendPtvMessage = useCallback((instanceName: string, number: string, video: string, delay?: number) =>
    callApi('send-ptv', { instanceName, number, video, delay }), [callApi]);

  const sendChatPresence = useCallback((instanceName: string, number: string, presence: 'composing' | 'recording' | 'paused', delay?: number) =>
    callApi('send-chat-presence', { instanceName, number, presence, delay }), [callApi]);

  // Message management
  const markMessageAsRead = useCallback((instanceName: string, key: object) =>
    callApi('mark-read', { instanceName, key }), [callApi]);

  const markMessageAsUnread = useCallback((instanceName: string, key: object) =>
    callApi('mark-unread', { instanceName, key }), [callApi]);

  const archiveChat = useCallback((instanceName: string, lastMessage: object, chat: string, archive = true) =>
    callApi('archive-chat', { instanceName, lastMessage, chat, archive }), [callApi]);

  const deleteMessage = useCallback((instanceName: string, id: string, remoteJid: string, fromMe: boolean) =>
    callApi('delete-message', { instanceName, id, remoteJid, fromMe }, 'DELETE'), [callApi]);

  const updateMessage = useCallback((instanceName: string, number: string, key: object, text: string) =>
    callApi('update-message', { instanceName, number, key, text }), [callApi]);

  const deleteMessageForEveryone = useCallback((instanceName: string, body: object) =>
    callApi('delete-for-everyone', { instanceName, ...body }, 'DELETE'), [callApi]);

  const editMessage = useCallback((instanceName: string, body: object) =>
    callApi('edit-message', { instanceName, ...body }), [callApi]);

  return {
    sendTextMessage, sendMediaMessage, sendAudioMessage, sendStickerMessage,
    sendLocationMessage, sendContactMessage, sendReaction, sendPollMessage,
    sendListMessage, sendButtonsMessage, sendStatusMessage, sendTemplateMessage,
    sendPtvMessage, sendChatPresence,
    markMessageAsRead, markMessageAsUnread, archiveChat, deleteMessage,
    updateMessage, deleteMessageForEveryone, editMessage,
  };
}
