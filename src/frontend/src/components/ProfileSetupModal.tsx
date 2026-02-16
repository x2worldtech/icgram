import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExternalBlob } from '../backend';
import { Loader2 } from 'lucide-react';
import { optimizeAvatarImage, validateImage } from '../utils/imageOptimization';

export default function ProfileSetupModal() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState<ExternalBlob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('/assets/generated/default-avatar.dim_200x200.png');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [formError, setFormError] = useState('');

  const saveProfile = useSaveCallerUserProfile();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image type
    if (!validateImage(file)) {
      setImageError(true);
      setTimeout(() => setImageError(false), 3000);
      return;
    }

    setIsOptimizing(true);

    try {
      // Optimize image on client side
      const optimized = await optimizeAvatarImage(file);
      
      // Log optimization results for debugging
      console.log(`Avatar optimized: ${(optimized.originalSize / 1024).toFixed(1)}KB → ${(optimized.optimizedSize / 1024).toFixed(1)}KB (${optimized.compressionRatio.toFixed(1)}% reduction)`);

      const bytes = new Uint8Array(await optimized.file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      setProfilePicture(blob);

      // Create preview from optimized file
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(optimized.file);
    } catch (error) {
      console.error('Error optimizing avatar:', error);
      setImageError(true);
      setTimeout(() => setImageError(false), 3000);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !displayName.trim()) {
      setFormError('Please fill in all required fields');
      setTimeout(() => setFormError(''), 3000);
      return;
    }

    try {
      await saveProfile.mutateAsync({
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        profilePicture: profilePicture || undefined,
        followers: [],
        following: [],
      });
    } catch (error) {
      console.error('Error creating profile:', error);
      setFormError('Error creating profile. Please try again.');
      setTimeout(() => setFormError(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl">
        <h2 className="mb-6 text-center text-2xl font-light tracking-tight">Create Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <label htmlFor="profile-picture" className={`cursor-pointer ${isOptimizing ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Profile picture"
                  className={`h-24 w-24 rounded-full object-cover ring-2 transition-all ${
                    imageError ? 'ring-red-500' : 'ring-border hover:ring-4'
                  }`}
                />
                {isOptimizing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <input
                id="profile-picture"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                disabled={isOptimizing}
              />
            </label>
          </div>

          {formError && (
            <div className="rounded-xl bg-red-50 p-3 text-center text-sm text-red-600">
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="rounded-xl"
              required
              disabled={saveProfile.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="rounded-xl"
              required
              disabled={saveProfile.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="rounded-xl resize-none"
              rows={3}
              disabled={saveProfile.isPending}
            />
          </div>

          <Button
            type="submit"
            disabled={saveProfile.isPending || isOptimizing}
            className="w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
          >
            {saveProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Profile'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
