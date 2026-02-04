import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { Loader2, Files } from 'lucide-react';
import { InferenceResult } from '../lib/types';
import { inferTradesFromText } from '../lib/tradeInference';

interface ScreenshotUploadProps {
  onResult: (result: InferenceResult) => void;
}

export function ScreenshotUpload({ onResult }: ScreenshotUploadProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    setError(null);
    setFileCount(files.length);

    try {
      const texts: string[] = [];
      
      const upscaleImage = async (file: File): Promise<Blob> => {
        const img = new Image();
        img.src = URL.createObjectURL(file);
        await img.decode();
      
        const canvas = document.createElement('canvas');
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
      
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
        return new Promise(resolve => 
          canvas.toBlob(b => resolve(b!), 'image/png')
        );
      };

      // Process files sequentially to avoid browser lag
      for (let i = 0; i < files.length; i++) {
          const file = files[i];
          
          console.log(`Processing file ${i + 1}/${files.length}...`);
          const processedFile = await upscaleImage(file);
          const { data: { text } } = await Tesseract.recognize(
        processedFile,
        'eng',
        { 
          logger: (m: any) => console.log(m),
          tessedit_char_whitelist: '0123456789.-ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
          tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
        } as any
      );
          texts.push(text);
      }
      
      console.log("Extracted texts:", texts);
      const inference = inferTradesFromText(texts);
      
      if (inference.trades.length === 0) {
          setError(
            "No trades detected. Tip: use full MT5 history view, avoid cropped screenshots, and ensure PnL column is visible."
          );
      } else {
          onResult(inference);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze screenshots.");
    } finally {
      setLoading(false);
      setFileCount(0);
    }
  };

  return (
    <div className="w-full space-y-4">
      <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${loading ? 'bg-slate-900 border-slate-700' : 'border-slate-700 hover:bg-slate-800'}`}>
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {loading ? (
            <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-2" />
                <p className="text-xs text-purple-400">Processing {fileCount} images...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
                <Files className="w-8 h-8 mb-2 text-purple-500" />
                <p className="text-sm text-slate-400 font-bold">
                    Upload Screenshots
                </p>
                <p className="text-xs text-slate-500 mt-1">
                    Select multiple files supported
                </p>
            </div>
          )}
        </div>
        <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} disabled={loading} />
      </label>
      {error && <p className="text-red-500 text-xs mt-2 text-center">{error}</p>}
    </div>
  );
}
