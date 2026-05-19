import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import { Check, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { ExternalBlob } from "../backend";
import { useCreatePost } from "../hooks/useQueries";
import { optimizePostImage, validateImage } from "../utils/imageOptimization";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createPost = useCreatePost();

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!validateImage(file)) {
      setImageError(true);
      setTimeout(() => setImageError(false), 3000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageError(true);
      setTimeout(() => setImageError(false), 3000);
      return;
    }

    setIsOptimizing(true);

    try {
      // Optimize image on client side
      const optimized = await optimizePostImage(file);

      // Log optimization results for debugging
      console.log(
        `Image optimized: ${(optimized.originalSize / 1024 / 1024).toFixed(2)}MB → ${(optimized.optimizedSize / 1024 / 1024).toFixed(2)}MB (${optimized.compressionRatio.toFixed(1)}% reduction)`,
      );

      setSelectedImage(optimized.file);

      // Create preview from optimized file
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(optimized.file);
    } catch (error) {
      console.error("Error optimizing image:", error);
      setImageError(true);
      setTimeout(() => setImageError(false), 3000);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedImage) {
      return;
    }

    try {
      const arrayBuffer = await selectedImage.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress(
        (percentage) => {
          setUploadProgress(percentage);
        },
      );

      await createPost.mutateAsync({ image: blob, caption });

      setShowSuccess(true);

      // Navigate after showing success
      setTimeout(() => {
        setSelectedImage(null);
        setImagePreview(null);
        setCaption("");
        setUploadProgress(0);
        setShowSuccess(false);
        navigate({ to: "/" });
      }, 1500);
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const isUploading = createPost.isPending;
  const captionLength = caption.length;
  const maxCaptionLength = 500;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4">
        <div className="space-y-6 py-4">
          <div>
            <h2 className="text-2xl font-light">Create Post</h2>
            <p className="text-sm text-muted-foreground">
              Share a photo with your followers
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="image">Photo</Label>
              {!imagePreview ? (
                <button
                  type="button"
                  onClick={() => !isOptimizing && fileInputRef.current?.click()}
                  className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-12 transition-all ${
                    imageError
                      ? "border-red-500 bg-red-50/50"
                      : isOptimizing
                        ? "border-primary bg-primary/5"
                        : "border-border bg-muted/20 hover:bg-muted/40"
                  }`}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                      <p className="text-sm text-primary">
                        Optimizing image...
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload
                        className={`h-12 w-12 ${imageError ? "text-red-500" : "text-muted-foreground"}`}
                      />
                      <p
                        className={`text-sm ${imageError ? "text-red-500" : "text-muted-foreground"}`}
                      >
                        {imageError
                          ? "Invalid image or size > 10MB"
                          : "Click to upload an image"}
                      </p>
                      {!imageError && (
                        <p className="text-xs text-muted-foreground">
                          Max size: 10MB • Auto-optimized for faster upload
                        </p>
                      )}
                    </>
                  )}
                </button>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full rounded-3xl object-contain"
                    style={{ maxHeight: "60vh" }}
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-2 top-2 rounded-full bg-background/80 p-2 backdrop-blur-sm transition-colors hover:bg-background"
                    aria-label="Remove image"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isOptimizing}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="caption">Caption</Label>
                <span className="text-xs text-muted-foreground">
                  {captionLength}/{maxCaptionLength}
                </span>
              </div>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) =>
                  setCaption(e.target.value.slice(0, maxCaptionLength))
                }
                placeholder="Write a caption..."
                className="min-h-24 resize-none rounded-2xl"
                disabled={isUploading}
              />
            </div>

            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Uploading...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={!selectedImage || isUploading || isOptimizing}
              className={`w-full rounded-full transition-all ${
                showSuccess ? "bg-green-500 hover:bg-green-600" : ""
              }`}
              size="lg"
            >
              {showSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Post Created!
                </>
              ) : isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Post...
                </>
              ) : (
                "Create Post"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
