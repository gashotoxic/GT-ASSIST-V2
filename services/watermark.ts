
export class WatermarkService {
  private static TEXT = "Gashotech";
  private static FONT_SIZE_RATIO = 0.05; // 5% of image height
  private static PADDING_RATIO = 0.02; // 2% padding

  /**
   * Takes an image Blob/File, draws it to canvas, adds the watermark, 
   * and returns a new Blob.
   */
  static async addWatermarkToImage(imageBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw original image
        ctx.drawImage(img, 0, 0);

        // Calculate font size
        const fontSize = Math.max(24, Math.floor(img.height * this.FONT_SIZE_RATIO));
        ctx.font = `bold ${fontSize}px sans-serif`;
        
        // Measure text
        const textMetrics = ctx.measureText(this.TEXT);
        const textWidth = textMetrics.width;
        const padding = Math.floor(img.height * this.PADDING_RATIO);

        // Position: Bottom Right
        const x = canvas.width - textWidth - padding;
        const y = canvas.height - padding;

        // Add Shadow/Outline for visibility on any background
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Draw Text
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)"; // White text
        ctx.fillText(this.TEXT, x, y);

        // Reset shadow for cleanliness
        ctx.shadowColor = "transparent";

        // Export
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas to Blob failed'));
          }
        }, 'image/png');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image for watermarking'));
      };

      img.src = url;
    });
  }
}
