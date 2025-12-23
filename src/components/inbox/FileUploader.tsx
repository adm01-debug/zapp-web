import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from '@/components/ui/motion';
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

interface FileUploaderProps {
  instanceName?: string;
  recipientNumber?: string;
  contactId?: string;
  connectionId?: string;
  onFileSelect?: (file: File, category: string) => void;
  onFileSent?: (messageData: any) => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  validation: FileValidationResult;
  preview?: string;
}

export interface FileUploaderRef {
  handleExternalFile: (file: File) => void;
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
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<'uploading' | 'sending' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { sendMediaMessage, sendAudioMessage, isLoading: apiLoading } = useEvolutionApi();

  // Expose method for external file handling (drag and drop)
  useImperativeHandle(ref, () => ({
    handleExternalFile: (file: File) => {
      const validation = validateFile(file);
      
      // Create preview for images
      let preview: string | undefined;
      if (validation.valid && validation.category === 'image') {
        preview = URL.createObjectURL(file);
      }

      setFilePreview({ file, validation, preview });
      setCaption('');
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
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { data, error } = await supabase.storage
      .from('whatsapp-media')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Erro ao fazer upload: ${error.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('whatsapp-media')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSendFile = async () => {
    if (!filePreview || !filePreview.validation.valid) return;

    // If no instance/recipient, just call the callback
    if (!instanceName || !recipientNumber) {
      onFileSelect?.(filePreview.file, filePreview.validation.category || 'document');
      handleClose();
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStage('uploading');

    try {
      // Step 1: Upload to storage
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 50));
      }, 100);

      const mediaUrl = await uploadFileToStorage(filePreview.file);
      
      clearInterval(progressInterval);
      setUploadProgress(50);
      setUploadStage('sending');

      // Step 2: Send via Evolution API
      const category = filePreview.validation.category;
      let result;
      let externalId: string | null = null;

      if (category === 'audio') {
        result = await sendAudioMessage(instanceName, recipientNumber, mediaUrl);
        externalId = result?.key?.id || null;
      } else {
        result = await sendMediaMessage({
          instanceName,
          number: recipientNumber,
          mediaUrl,
          mediaType: category as 'image' | 'video' | 'audio' | 'document',
          caption: caption || undefined,
        });
        externalId = result?.key?.id || null;
      }

      // Step 3: Save message to database
      if (contactId) {
        const messageContent = category === 'document' 
          ? filePreview.file.name 
          : caption || `[${category === 'image' ? 'Imagem' : category === 'video' ? 'Vídeo' : category === 'audio' ? 'Áudio' : 'Arquivo'}]`;

        const { error: dbError } = await supabase
          .from('messages')
          .insert({
            contact_id: contactId,
            whatsapp_connection_id: connectionId || null,
            content: messageContent,
            message_type: category || 'document',
            media_url: mediaUrl,
            sender: 'agent',
            external_id: externalId,
            status: 'sent',
          });

        if (dbError) {
          console.error('Error saving message to database:', dbError);
        } else {
          console.log('Media message saved to database');
        }
      }

      setUploadProgress(100);
      
      toast.success('Arquivo enviado com sucesso!');
      onFileSent?.({ ...result, mediaUrl, messageType: category });
      handleClose();
    } catch (error: any) {
      console.error('Error sending file:', error);
      toast.error(error.message || 'Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStage(null);
    }
  };

  const handleClose = () => {
    if (filePreview?.preview) {
      URL.revokeObjectURL(filePreview.preview);
    }
    setFilePreview(null);
    setCaption('');
    setIsDialogOpen(false);
  };

  const canSend = instanceName && recipientNumber;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={getFileInputAccept()}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || uploading}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Enviar Arquivo
            </DialogTitle>
            <DialogDescription>
              Formatos suportados: imagens, vídeos, áudios e documentos
            </DialogDescription>
          </DialogHeader>

          {filePreview && (
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

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={uploading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendFile}
                  disabled={!filePreview.validation.valid || uploading || apiLoading}
                  className="bg-whatsapp hover:bg-whatsapp-dark"
                >
                  {uploading ? (
                    'Enviando...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {canSend ? 'Enviar' : 'Selecionar'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
});

FileUploader.displayName = 'FileUploader';
