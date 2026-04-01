import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { log } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Paperclip,
  Image as ImageIcon,
  FileVideo,
  FileAudio,
  FileText,
  X,
  Upload,
  AlertCircle,
  Check,
  Send,
} from 'lucide-react';
import {
  validateFile,
  getFileInputAccept,
  formatFileSize,
  WHATSAPP_FILE_TYPES,
  FileValidationResult,
} from '@/utils/whatsappFileTypes';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { toast } from 'sonner';
import { compressImage, formatCompressionInfo } from '@/utils/imageCompression';

interface FileMessageData {
  mediaUrl?: string;
  messageType?: string;
  [key: string]: unknown;
}

interface FileUploaderProps {
  instanceName?: string;
  recipientNumber?: string;
  contactId?: string;
  connectionId?: string;
  onFileSelect?: (file: File, category: string) => void;
  onFileSent?: (messageData: FileMessageData) => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  validation: FileValidationResult;
  preview?: string;
}

interface QueuedFile extends FilePreview {
  id: string;
  status: 'pending' | 'uploading' | 'sending' | 'done' | 'error';
  progress: number;
  error?: string;
}

export interface FileUploaderRef {
  handleExternalFile: (file: File) => void;
  handleExternalFiles: (files: File[]) => void;
}

export const FileUploader = forwardRef<FileUploaderRef, FileUploaderProps>(({ 
  instanceName, 
  recipientNumber,
  contactId,
  connectionId,
  onFileSelect, 
  onFileSent,
  disabled 
}, ref) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'uploading' | 'sending' | null>(null);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { sendMediaMessage, sendAudioMessage, isLoading: apiLoading } = useEvolutionApi();

  const MAX_FILES = 10;

  // Category order for sorting
  const categoryOrder: Record<string, number> = {
    image: 0,
    video: 1,
    audio: 2,
    document: 3,
    sticker: 4,
  };

  // Process multiple files into queue with sorting by type
  const processFilesToQueue = (files: File[]): QueuedFile[] => {
    const processed = files.slice(0, MAX_FILES).map((file, index) => {
      const validation = validateFile(file);
      let preview: string | undefined;
      if (validation.valid && validation.category === 'image') {
        preview = URL.createObjectURL(file);
      }
      return {
        id: `${Date.now()}-${index}`,
        file,
        validation,
        preview,
        status: 'pending' as const,
        progress: 0,
      };
    });

    // Sort by category: images first, then videos, audio, documents
    return processed.sort((a, b) => {
      const catA = a.validation.category || 'document';
      const catB = b.validation.category || 'document';
      return (categoryOrder[catA] ?? 99) - (categoryOrder[catB] ?? 99);
    });
  };

  // Expose methods for external file handling (drag and drop)
  useImperativeHandle(ref, () => ({
    handleExternalFile: (file: File) => {
      const validation = validateFile(file);
      
      let preview: string | undefined;
      if (validation.valid && validation.category === 'image') {
        preview = URL.createObjectURL(file);
      }

      setFilePreview({ file, validation, preview });
      setIsMultiMode(false);
      setFileQueue([]);
      setCaption('');
      setIsDialogOpen(true);
    },
    handleExternalFiles: (files: File[]) => {
      if (files.length > MAX_FILES) {
        toast.warning(`Limite de ${MAX_FILES} arquivos por vez. Apenas os primeiros ${MAX_FILES} serão enviados.`);
      }

      if (files.length === 1) {
        // Single file - use simple mode
        const file = files[0];
        const validation = validateFile(file);
        let preview: string | undefined;
        if (validation.valid && validation.category === 'image') {
          preview = URL.createObjectURL(file);
        }
        setFilePreview({ file, validation, preview });
        setIsMultiMode(false);
        setFileQueue([]);
      } else {
        // Multiple files - use queue mode with limit and sorting
        const queue = processFilesToQueue(files);
        setFileQueue(queue);
        setIsMultiMode(true);
        setFilePreview(null);
      }
      setCaption('');
      setCurrentQueueIndex(0);
      setIsDialogOpen(true);
    }
  }));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <FileVideo className="w-5 h-5" />;
      case 'audio':
        return <FileAudio className="w-5 h-5" />;
      case 'document':
      case 'sticker':
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateFile(file);

    // Create preview for images
    let preview: string | undefined;
    if (validation.valid && validation.category === 'image') {
      preview = URL.createObjectURL(file);
    }

    setFilePreview({ file, validation, preview });
    setCaption('');
    setIsDialogOpen(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFileToStorage = async (file: File): Promise<string> => {
    // Compress images before upload (optimized: WebP, 1280px, OffscreenCanvas)
    let fileToUpload = file;
    if (file.type.startsWith('image/') && file.type !== 'image/gif') {
      try {
        const result = await compressImage(file);
        if (result.wasCompressed) {
          log.debug('Image compressed:', formatCompressionInfo(result.originalSize, result.compressedSize));
          fileToUpload = result.file;
        }
      } catch (err) {
        log.warn('Image compression failed, uploading original:', err);
      }
    }

    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, fileToUpload, {
        cacheControl: '31536000',
        upsert: false,
      });

    if (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    const { data: signedData, error: signError } = await supabase.storage
      .from('whatsapp-media')
      .createSignedUrl(filePath, 3600);

    if (signError || !signedData?.signedUrl) {
      throw new Error('Erro ao gerar URL do arquivo');
    }

    return signedData.signedUrl;
  };

  const handleSendFile = async () => {
    if (!filePreview || !filePreview.validation.valid) return;

    // If no instance/recipient, just call the callback
    if (!instanceName || !recipientNumber) {
      onFileSelect?.(filePreview.file, filePreview.validation.category || 'document');
      handleClose();
      return;
    }

    const fileToSend = filePreview.file;
    const category = filePreview.validation.category;
    const currentCaption = caption;
    const messageContent = category === 'document' 
      ? fileToSend.name 
      : currentCaption || `[${category === 'image' ? 'Imagem' : category === 'video' ? 'Vídeo' : category === 'audio' ? 'Áudio' : 'Arquivo'}]`;

    // Close dialog IMMEDIATELY for optimistic UX
    handleClose();
    toast.info('Enviando arquivo...', { id: 'file-upload', duration: 30000 });

    try {
      // Step 1: Compress + Upload to storage
      const mediaUrl = await uploadFileToStorage(fileToSend);

      // Step 2: Send via API + save to DB IN PARALLEL
      const apiPromise = category === 'audio'
        ? sendAudioMessage(instanceName, recipientNumber, mediaUrl)
        : sendMediaMessage({
            instanceName,
            number: recipientNumber,
            mediaUrl,
            mediaType: category as 'image' | 'video' | 'audio' | 'document',
            caption: currentCaption || undefined,
          });

      const dbPromise = contactId
        ? supabase.from('messages').insert({
            contact_id: contactId,
            whatsapp_connection_id: connectionId || null,
            content: messageContent,
            message_type: category || 'document',
            media_url: mediaUrl,
            sender: 'agent',
            status: 'sending',
          }).select('id').single()
        : Promise.resolve(null);

      const [result, dbResult] = await Promise.all([apiPromise, dbPromise]);
      
      // Fire-and-forget: update DB with external_id
      const externalId = result?.key?.id || null;
      if (dbResult?.data?.id && externalId) {
        supabase.from('messages')
          .update({ external_id: externalId, status: 'sent' })
          .eq('id', dbResult.data.id)
          .then(() => {});
      }

      toast.success('Arquivo enviado!', { id: 'file-upload' });
      onFileSent?.({ ...result, mediaUrl, messageType: category });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      log.error('Error sending file:', error);
      toast.error(error.message || 'Erro ao enviar arquivo', { id: 'file-upload' });
    }
  };

  const handleClose = () => {
    if (filePreview?.preview) {
      URL.revokeObjectURL(filePreview.preview);
    }
    // Clean up queue previews
    fileQueue.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFilePreview(null);
    setFileQueue([]);
    setIsMultiMode(false);
    setCaption('');
    setCurrentQueueIndex(0);
    setIsDialogOpen(false);
  };

  // Send single file from queue
  const sendSingleQueueFile = async (queuedFile: QueuedFile, index: number): Promise<boolean> => {
    if (!queuedFile.validation.valid || !instanceName || !recipientNumber) {
      return false;
    }

    setFileQueue(prev => prev.map((f, i) => 
      i === index ? { ...f, status: 'uploading', progress: 0 } : f
    ));

    try {
      // Upload to storage
      const mediaUrl = await uploadFileToStorage(queuedFile.file);
      
      setFileQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'sending', progress: 50 } : f
      ));

      // Send via API + save to DB in parallel
      const category = queuedFile.validation.category;
      const messageContent = category === 'document' 
        ? queuedFile.file.name 
        : `[${category === 'image' ? 'Imagem' : category === 'video' ? 'Vídeo' : category === 'audio' ? 'Áudio' : 'Arquivo'}]`;

      const apiPromise = category === 'audio'
        ? sendAudioMessage(instanceName, recipientNumber, mediaUrl)
        : sendMediaMessage({
            instanceName,
            number: recipientNumber,
            mediaUrl,
            mediaType: category as 'image' | 'video' | 'audio' | 'document',
            caption: undefined,
          });

      const dbPromise = contactId
        ? supabase.from('messages').insert({
            contact_id: contactId,
            whatsapp_connection_id: connectionId || null,
            content: messageContent,
            message_type: category || 'document',
            media_url: mediaUrl,
            sender: 'agent',
            status: 'sending',
          }).select('id').single()
        : Promise.resolve(null);

      const [result, dbResult] = await Promise.all([apiPromise, dbPromise]);
      
      const externalId = result?.key?.id || null;
      if (dbResult?.data?.id && externalId) {
        supabase.from('messages')
          .update({ external_id: externalId, status: 'sent' })
          .eq('id', dbResult.data.id)
          .then(() => {});
      }

      setFileQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'done', progress: 100 } : f
      ));

      onFileSent?.({ ...result, mediaUrl, messageType: category });
      return true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      log.error('Error sending queued file:', error);
      setFileQueue(prev => prev.map((f, i) => 
        i === index ? { ...f, status: 'error', error: error.message } : f
      ));
      return false;
    }
  };

  // Send all files in queue sequentially
  const handleSendAllFiles = async () => {
    if (fileQueue.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < fileQueue.length; i++) {
      setCurrentQueueIndex(i);
      const file = fileQueue[i];
      
      if (file.validation.valid) {
        const success = await sendSingleQueueFile(file, i);
        if (success) {
          successCount++;
        } else {
          errorCount++;
        }
        // Small delay between files to avoid rate limiting
        if (i < fileQueue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        errorCount++;
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} arquivo(s) enviado(s) com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} arquivo(s) falharam ao enviar`);
    }

    // Close after a short delay to show final status
    setTimeout(() => {
      handleClose();
    }, 1000);
  };

  // Remove file from queue
  const removeFromQueue = (id: string) => {
    setFileQueue(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const canSend = instanceName && recipientNumber;
  const validFilesCount = fileQueue.filter(f => f.validation.valid).length;
  const totalQueueProgress = fileQueue.length > 0 
    ? Math.round(fileQueue.reduce((acc, f) => acc + f.progress, 0) / fileQueue.length)
    : 0;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={getFileInputAccept()}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
        multiple
      />
      
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
          title="Anexar arquivo"
        >
          <Paperclip className="w-5 h-5" />
        </Button>
      </motion.div>

      <Dialog open={isDialogOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              {isMultiMode ? `Enviar ${fileQueue.length} Arquivos` : 'Enviar Arquivo'}
            </DialogTitle>
            <DialogDescription>
              {isMultiMode 
                ? `${validFilesCount} de ${fileQueue.length} arquivos válidos para envio`
                : 'Formatos suportados: imagens, vídeos, áudios e documentos'}
            </DialogDescription>
          </DialogHeader>

          {/* Multi-file queue mode */}
          {isMultiMode && fileQueue.length > 0 && (
            <div className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[40vh]">
              {fileQueue.map((queuedFile, index) => (
                <motion.div
                  key={queuedFile.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className={cn(
                    "relative border rounded-lg p-3 bg-muted/30",
                    queuedFile.status === 'done' && "border-success/50 bg-success/10",
                    queuedFile.status === 'error' && "border-destructive/50 bg-destructive/10",
                    !queuedFile.validation.valid && "border-destructive/50 bg-destructive/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Preview/Icon */}
                    <div className="flex-shrink-0">
                      {queuedFile.preview ? (
                        <img
                          src={queuedFile.preview}
                          alt="Preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-primary/10 rounded flex items-center justify-center text-primary">
                          {getCategoryIcon(queuedFile.validation.category || 'document')}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {queuedFile.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(queuedFile.file.size)}
                        </span>
                        {queuedFile.validation.valid ? (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-success/10 text-success border-success/20">
                            {queuedFile.validation.category}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px] py-0 h-5">
                            Inválido
                          </Badge>
                        )}
                        {queuedFile.status === 'uploading' && (
                          <Badge variant="secondary" className="text-[10px] py-0 h-5">
                            Enviando...
                          </Badge>
                        )}
                        {queuedFile.status === 'done' && (
                          <Badge variant="outline" className="text-[10px] py-0 h-5 bg-success/10 text-success border-success/20">
                            <Check className="w-3 h-3 mr-1" />
                            Enviado
                          </Badge>
                        )}
                        {queuedFile.status === 'error' && (
                          <Badge variant="destructive" className="text-[10px] py-0 h-5">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Erro
                          </Badge>
                        )}
                      </div>
                      
                      {/* Progress bar for this file */}
                      {(queuedFile.status === 'uploading' || queuedFile.status === 'sending') && (
                        <Progress value={queuedFile.progress} className="h-1 mt-2" />
                      )}
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 h-7 w-7"
                      onClick={() => removeFromQueue(queuedFile.id)}
                      disabled={uploading}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Single file mode */}
          {!isMultiMode && filePreview && (
            <div className="space-y-4">
              {/* File Preview */}
              <div className="relative border rounded-lg p-4 bg-muted/50">
                <div className="flex items-start gap-4">
                  {/* Preview/Icon */}
                  <div className="flex-shrink-0">
                    {filePreview.preview ? (
                      <img
                        src={filePreview.preview}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        {getCategoryIcon(filePreview.validation.category || 'document')}
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {filePreview.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(filePreview.file.size)}
                    </p>
                    
                    {filePreview.validation.valid ? (
                      <Badge variant="outline" className="mt-2 text-xs bg-success/10 text-success border-success/20">
                        <Check className="w-3 h-3 mr-1" />
                        {filePreview.validation.category}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="mt-2 text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Inválido
                      </Badge>
                    )}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="flex-shrink-0 h-8 w-8"
                    onClick={handleClose}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Error Message */}
                {!filePreview.validation.valid && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-destructive flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      {filePreview.validation.error}
                    </p>
                  </div>
                )}
              </div>

              {/* Caption Input (for images/videos) */}
              {filePreview.validation.valid && 
               ['image', 'video', 'document'].includes(filePreview.validation.category || '') && (
                <div className="space-y-2">
                  <Label htmlFor="caption">Legenda (opcional)</Label>
                  <Input
                    id="caption"
                    placeholder="Adicione uma legenda..."
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    disabled={uploading}
                  />
                </div>
              )}

              {/* Upload Progress */}
              <AnimatePresence>
                {uploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2"
                  >
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {uploadStage === 'uploading' 
                        ? `Fazendo upload... ${uploadProgress}%` 
                        : `Enviando via WhatsApp... ${uploadProgress}%`}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* File Size Limits Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <p className="font-medium mb-2">Limites de tamanho do WhatsApp:</p>
            <ul className="space-y-1">
              <li>• Imagens: até {WHATSAPP_FILE_TYPES.image.maxSizeMB}MB (JPG, PNG, WebP)</li>
              <li>• Vídeos: até {WHATSAPP_FILE_TYPES.video.maxSizeMB}MB (MP4, 3GP)</li>
              <li>• Áudios: até {WHATSAPP_FILE_TYPES.audio.maxSizeMB}MB (AAC, MP3, OGG, OPUS)</li>
              <li>• Documentos: até {WHATSAPP_FILE_TYPES.document.maxSizeMB}MB (PDF, DOC, XLS, etc)</li>
            </ul>
          </div>

          {/* Connection Warning */}
          {!canSend && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Selecione uma conversa para enviar o arquivo via WhatsApp
              </p>
            </div>
          )}

          {/* Overall Queue Progress */}
          {isMultiMode && uploading && (
            <div className="space-y-2">
              <Progress value={totalQueueProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                Enviando arquivo {currentQueueIndex + 1} de {fileQueue.length}...
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              Cancelar
            </Button>
            <Button
              onClick={isMultiMode ? handleSendAllFiles : handleSendFile}
              disabled={
                (isMultiMode ? validFilesCount === 0 : !filePreview?.validation.valid) || 
                uploading || 
                apiLoading
              }
              className="bg-whatsapp hover:bg-whatsapp-dark"
            >
              {uploading ? (
                'Enviando...'
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {isMultiMode 
                    ? `Enviar ${validFilesCount} arquivo${validFilesCount !== 1 ? 's' : ''}`
                    : canSend ? 'Enviar' : 'Selecionar'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

FileUploader.displayName = 'FileUploader';
