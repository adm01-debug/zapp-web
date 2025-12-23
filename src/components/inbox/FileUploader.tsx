import { useState, useRef } from 'react';
import { motion, AnimatePresence } from '@/components/ui/motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import {
  validateFile,
  getFileInputAccept,
  formatFileSize,
  WHATSAPP_FILE_TYPES,
  FileValidationResult,
} from '@/utils/whatsappFileTypes';
import { toast } from 'sonner';

interface FileUploaderProps {
  onFileSelect: (file: File, category: string) => void;
  disabled?: boolean;
}

interface FilePreview {
  file: File;
  validation: FileValidationResult;
  preview?: string;
}

export function FileUploader({ onFileSelect, disabled }: FileUploaderProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsDialogOpen(true);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendFile = async () => {
    if (!filePreview || !filePreview.validation.valid) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      onFileSelect(filePreview.file, filePreview.validation.category || 'document');
      
      toast.success('Arquivo enviado com sucesso!');
      setIsDialogOpen(false);
      setFilePreview(null);
    } catch (error) {
      toast.error('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      clearInterval(interval);
    }
  };

  const handleClose = () => {
    if (filePreview?.preview) {
      URL.revokeObjectURL(filePreview.preview);
    }
    setFilePreview(null);
    setIsDialogOpen(false);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={getFileInputAccept()}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
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

                {/* Upload Progress */}
                <AnimatePresence>
                  {uploading && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1 text-center">
                        Enviando... {uploadProgress}%
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* File Size Limits Info */}
              <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <p className="font-medium mb-2">Limites de tamanho:</p>
                <ul className="space-y-1">
                  <li>• Imagens: até {WHATSAPP_FILE_TYPES.image.maxSizeMB}MB</li>
                  <li>• Vídeos: até {WHATSAPP_FILE_TYPES.video.maxSizeMB}MB</li>
                  <li>• Áudios: até {WHATSAPP_FILE_TYPES.audio.maxSizeMB}MB</li>
                  <li>• Documentos: até {WHATSAPP_FILE_TYPES.document.maxSizeMB}MB</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleClose} disabled={uploading}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSendFile}
                  disabled={!filePreview.validation.valid || uploading}
                  className="bg-whatsapp hover:bg-whatsapp-dark"
                >
                  {uploading ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
