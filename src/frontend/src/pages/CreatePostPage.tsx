import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useCreatePost } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, X, Check } from 'lucide-react';
import { ExternalBlob } from '../backend';
import { optimizePostImage } from '../utils/imageOptimization';

export default function CreatePostPage() {
  const navigate = useNavigate();
  const { identity } = useInternetIdentity();
  const createPost = useCreatePost();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedImage(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedImage || !identity) {
      return;
    }

    try {
      setIsOptimizing(true);
      const optimizedResult = await optimizePostImage(selectedImage);

      // Convert File to Uint8Array for ExternalBlob
      const arrayBuffer = await optimizedResult.file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      setIsOptimizing(false);

      const blob = ExternalBlob.fromBytes(bytes);
      const currentUserPrincipal = identity.getPrincipal();

      await createPost.mutateAsync({
        image: blob,
        caption: caption.trim(),
        authorPrincipal: currentUserPrincipal,
      });

      setShowSuccess(true);
      setTimeout(() => {
        navigate({ to: '/' });
      }, 500);
    } catch (error) {
      console.error('Error creating post:', error);
      setIsOptimizing(false);
    }
  };

  const isSubmitting = createPost.isPending || isOptimizing;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-light">Create Post</h1>
          <Button
            onClick={() => navigate({ to: '/' })}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!previewUrl ? (
            <label className="flex flex-col items-center justify-center w-full aspect-square border-2 border-dashed border-border rounded-3xl cursor-pointer hover:border-primary transition-colors bg-muted/20">
              <Camera className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">Tap to select an image</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={isSubmitting}
              />
            </label>
          ) : (
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-muted">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isSubmitting}
                className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}

          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            className="min-h-[100px] resize-none rounded-3xl"
            disabled={isSubmitting}
          />

          <Button
            type="submit"
            disabled={!selectedImage || isSubmitting}
            className={`w-full rounded-full transition-all ${
              showSuccess ? 'bg-green-500 hover:bg-green-600' : ''
            }`}
          >
            {showSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Posted!
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isOptimizing ? 'Optimizing...' : 'Posting...'}
              </>
            ) : (
              'Share Post'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
