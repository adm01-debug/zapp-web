/**
 * Shared Zod schemas for Edge Function input validation.
 * Import: import { z, parseBody, ... } from "../_shared/schemas.ts";
 */
import { z } from "https://esm.sh/zod@3.23.8";

export { z };

// ─── Common reusable schemas ─────────────────────────────────
export const UUIDSchema = z.string().uuid("Must be a valid UUID");
export const EmailSchema = z.string().email("Invalid email").max(255);
export const SafeStringSchema = (maxLen = 10000) => z.string().max(maxLen).transform(s => s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim());

// ─── AI function schemas ─────────────────────────────────────
export const MessageSchema = z.object({
  sender: z.string().max(50).optional(),
  content: z.string().max(5000).optional(),
  created_at: z.string().optional(),
  message_type: z.string().max(50).optional(),
});

export const AiSuggestReplySchema = z.object({
  messages: z.array(MessageSchema).max(50).optional(),
  contactName: z.string().max(200).optional().default('Cliente'),
  contactId: z.string().uuid().optional().nullable(),
  context: z.string().max(500).optional(),
});

export const AiEnhanceMessageSchema = z.object({
  message: z.string().min(1, "Mensagem é obrigatória").max(4096),
  tone: z.enum(['professional', 'casual', 'persuasive', 'empathetic', 'concise', 'detailed']).optional().default('professional'),
});

export const AiConversationAnalysisSchema = z.object({
  messages: z.array(MessageSchema).min(5, "Conversation must have at least 5 messages").max(200),
  contactName: z.string().max(200).optional(),
  contactId: z.string().uuid().optional().nullable(),
});

export const AiAutoTagSchema = z.object({
  contactId: z.string().uuid().optional().nullable(),
  messages: z.array(MessageSchema).max(100).optional(),
});

export const AiChurnAnalysisSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, "contactIds é obrigatório").max(50),
});

export const AiClassifyTicketsSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

// ─── ElevenLabs schemas ──────────────────────────────────────
export const ElevenLabsTTSSchema = z.object({
  text: z.string().min(1, "Text is required").max(5000),
  voiceId: z.string().max(100).optional(),
  modelId: z.string().max(100).optional(),
  languageCode: z.string().max(10).optional(),
  applyTextNormalization: z.string().max(20).optional(),
});

export const ElevenLabsSFXSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(2000),
  duration: z.number().min(1).max(300).optional(),
  mode: z.enum(['sfx', 'music']).optional().default('sfx'),
});

export const ElevenLabsDialogueSchema = z.object({
  script: z.array(z.object({
    voice_id: z.string().min(1, "voice_id is required").max(100),
    text: z.string().min(1, "text is required").max(5000),
  })).min(1, "Script is required"),
  languageCode: z.string().max(10).optional().default('pt'),
});

export const ElevenLabsVoiceDesignPreviewSchema = z.object({
  action: z.literal('preview').optional(),
  description: z.string().min(1, "Voice description is required").max(1000),
  text: z.string().max(2000).optional(),
});

export const ElevenLabsVoiceDesignCreateSchema = z.object({
  action: z.literal('create'),
  voice_name: z.string().min(1, "Voice name is required").max(255),
  voice_description: z.string().max(1000).optional(),
  generated_voice_id: z.string().min(1, "Generated voice ID is required").max(255),
  labels: z.record(z.string()).optional(),
});

// ─── Transcription schemas ───────────────────────────────────
const ALLOWED_LANGUAGES = ['por', 'eng', 'spa', 'fra', 'deu', 'ita', 'jpn', 'kor', 'zho', 'ara', 'hin', 'rus'] as const;
export const TranscribeAudioSchema = z.object({
  audioUrl: z.string().url("Invalid audio URL").max(2048),
  messageId: z.string().max(100).optional(),
  languageCode: z.enum(ALLOWED_LANGUAGES).optional().default('por'),
  enableDiarization: z.boolean().optional().default(false),
  tagAudioEvents: z.boolean().optional().default(true),
});

// ─── Classifier schemas ──────────────────────────────────────
export const ClassifyAudioMemeSchema = z.object({
  audio_url: z.string().url().max(2048).optional().nullable(),
  file_name: z.string().max(500).optional().nullable(),
});

export const ClassifyEmojiSchema = z.object({
  image_url: z.string().url().max(2048).optional().nullable(),
  file_name: z.string().max(500).optional().nullable(),
});

export const ClassifyStickerSchema = z.object({
  image_url: z.string().url().max(2048).optional().nullable(),
});

// ─── Email schemas ───────────────────────────────────────────
export const SendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email()).min(1).max(50)]),
  subject: z.string().min(1, "Subject is required").max(500),
  html: z.string().max(100000).optional(),
  text: z.string().max(100000).optional(),
  from: z.string().max(255).optional(),
  reply_to: z.string().email().optional(),
  cc: z.array(z.string().email()).max(20).optional(),
  bcc: z.array(z.string().email()).max(20).optional(),
  attachments: z.array(z.object({
    filename: z.string().max(255),
    content: z.string(), // base64
    content_type: z.string().max(100).optional(),
  })).max(10).optional(),
});

// ─── Sentiment Alert ─────────────────────────────────────────
export const SentimentAlertSchema = z.object({
  contactId: z.string().uuid(),
  contactName: z.string().max(200),
  sentimentScore: z.number().min(0).max(100),
  previousScore: z.number().min(0).max(100).optional(),
  analysisId: z.string().uuid(),
  agentEmail: z.string().email().optional(),
  threshold: z.number().min(0).max(100).optional().default(30),
  consecutiveRequired: z.number().int().min(1).max(10).optional().default(2),
});

// ─── Rate Limit Alert ────────────────────────────────────────
export const RateLimitAlertSchema = z.object({
  ip_address: z.string().max(45),
  endpoint: z.string().max(500),
  request_count: z.number().int().min(1),
  blocked: z.boolean(),
});

// ─── Password Reset ──────────────────────────────────────────
export const ApprovePasswordResetSchema = z.object({
  requestId: z.string().uuid("requestId must be a valid UUID"),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
});

// ─── Helper: parse body with schema ──────────────────────────
export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.flatten();
    const fieldErrors = Object.entries(errors.fieldErrors)
      .map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`)
      .join('; ');
    const formErrors = errors.formErrors.join('; ');
    return { success: false, error: [formErrors, fieldErrors].filter(Boolean).join('; ') };
  }
  return { success: true, data: result.data };
}
