import React, { useRef, useState } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ImagePickerProps {
  onImageSelect: (imageBase64: string) => void;
  selectedImage?: string;
  onClear?: () => void;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({
  onImageSelect,
  selectedImage,
  onClear
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const base64 = result.split(',')[1]; // Remove o prefixo data:image/...;base64,
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  if (selectedImage) {
    return (
      <Card className="medical-card p-4 relative">
        <img 
          src={`data:image/jpeg;base64,${selectedImage}`}
          alt="Receita selecionada"
          className="w-full h-auto rounded-lg shadow-[var(--shadow-soft)]"
        />
        {onClear && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </Card>
    );
  }

  return (
    <Card 
      className={`medical-card p-8 text-center transition-all cursor-pointer ${
        dragOver ? 'border-primary bg-primary/5 scale-105' : 'hover:border-primary/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Adicionar Receita Médica
          </h3>
          <p className="text-muted-foreground mb-4">
            Tire uma foto ou selecione uma imagem da sua receita
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="medical"
            className="flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              // Simular clique da câmera (mobile)
              if (fileInputRef.current) {
                fileInputRef.current.setAttribute('capture', 'environment');
                fileInputRef.current.click();
              }
            }}
          >
            <Camera className="h-4 w-4" />
            Usar Câmera
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              if (fileInputRef.current) {
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
              }
            }}
          >
            <Upload className="h-4 w-4" />
            Escolher Arquivo
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Ou arraste e solte uma imagem aqui
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />
    </Card>
  );
};