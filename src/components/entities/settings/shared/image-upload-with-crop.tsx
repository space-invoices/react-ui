import { useRef, useState } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Upload } from "lucide-react";
import { Button } from "@/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/components/ui/dialog";

interface ImageUploadWithCropProps {
  value?: string;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<{ secureUrl: string }>;
  translate: (key: string) => string;
  isUploading?: boolean;
  imageType?: "logo" | "signature"; // Type of image for labels
}

export function ImageUploadWithCrop({
  value,
  onChange,
  onUpload,
  translate,
  isUploading = false,
  imageType = "logo",
}: ImageUploadWithCropProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 80,
    height: 60,
    x: 10,
    y: 20,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setIsDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const getCroppedImg = async (): Promise<Blob | null> => {
    if (!imgRef.current) return null;

    // If no crop was completed, use the full image
    if (!completedCrop || completedCrop.width === 0 || completedCrop.height === 0) {
      // Convert the full image to blob
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      canvas.width = imgRef.current.naturalWidth;
      canvas.height = imgRef.current.naturalHeight;

      ctx.drawImage(imgRef.current, 0, 0);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, "image/png");
      });
    }

    // Crop the image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/png");
    });
  };

  const handleUploadCropped = async () => {
    try {
      setUploading(true);
      const croppedBlob = await getCroppedImg();

      if (!croppedBlob) {
        throw new Error("Failed to crop image");
      }

      const file = new File([croppedBlob], `${imageType}.png`, { type: "image/png" });
      const result = await onUpload(file);

      onChange(result.secureUrl);
      setIsDialogOpen(false);
      setSelectedImage(null);
    } catch (error) {
      console.error("Upload failed:", error);
      alert(translate("Upload failed. Please try again."));
    } finally {
      setUploading(false);
    }
  };

  const isDisabled = isUploading || uploading;

  // Dynamic labels based on image type
  const uploadLabel = imageType === "logo" ? "Upload Logo" : "Upload Signature";
  const changeLabel = imageType === "logo" ? "Change Logo" : "Change Signature";
  const currentLabel =
    imageType === "logo" ? "Current logo (displayed on invoices)" : "Current signature (for PDF documents)";
  const altText = imageType === "logo" ? "Logo preview" : "Signature preview";

  return (
    <div className="space-y-4">
      {value ? (
        <div className="space-y-3">
          <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/20 p-6">
            <div className="rounded-md bg-background p-4 shadow-sm">
              <img key={value} src={value} alt={translate(altText)} className="max-h-32 max-w-full object-contain" />
            </div>
            <p className="text-center font-medium text-muted-foreground text-xs">{translate(currentLabel)}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="w-full cursor-pointer"
          >
            <Upload className="mr-2 h-4 w-4" />
            {translate(changeLabel)}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isDisabled}
          className="h-32 w-full cursor-pointer border-dashed"
        >
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="font-medium text-sm">{translate(uploadLabel)}</span>
            <span className="text-muted-foreground text-xs">PNG, JPG, WebP, or GIF</span>
          </div>
        </Button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isDisabled}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{translate(imageType === "logo" ? "Crop Your Logo" : "Crop Your Signature")}</DialogTitle>
            <DialogDescription>{translate("Adjust the crop area or upload the full image")}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {selectedImage && (
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={undefined}
              >
                <img ref={imgRef} src={selectedImage} alt="Crop preview" className="max-w-full" />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setIsDialogOpen(false)}
              disabled={uploading}
            >
              {translate("Cancel")}
            </Button>
            <Button onClick={handleUploadCropped} disabled={uploading} className="cursor-pointer">
              {uploading ? translate("Uploading...") : translate("Upload & Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
