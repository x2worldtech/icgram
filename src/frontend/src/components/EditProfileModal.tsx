import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { ExternalBlob } from "../backend";
import { useSaveCallerUserProfile } from "../hooks/useQueries";
import type { UserProfile } from "../types";
import { optimizeAvatarImage, validateImage } from "../utils/imageOptimization";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: UserProfile;
}

export default function EditProfileModal({
  open,
  onOpenChange,
  currentProfile,
}: EditProfileModalProps) {
  const [username, setUsername] = useState(currentProfile.username);
  const [displayName, setDisplayName] = useState(currentProfile.displayName);
  const [bio, setBio] = useState(currentProfile.bio);
  const [profilePicture, setProfilePicture] = useState<
    ExternalBlob | undefined
  >(currentProfile.profilePicture);
  const [previewUrl, setPreviewUrl] = useState<string>(
    currentProfile.profilePicture?.getDirectURL() ||
      "/assets/generated/default-avatar.dim_200x200.png",
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [imageError, setImageError] = useState(false);

  const saveProfile = useSaveCallerUserProfile();

  useEffect(() => {
    if (open) {
      setUsername(currentProfile.username);
      setDisplayName(currentProfile.displayName);
      setBio(currentProfile.bio);
      setProfilePicture(currentProfile.profilePicture);
      setPreviewUrl(
        currentProfile.profilePicture?.getDirectURL() ||
          "/assets/generated/default-avatar.dim_200x200.png",
      );
      setShowSuccess(false);
      setUploadProgress(0);
    }
  }, [open, currentProfile]);

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
      console.log(
        `Avatar optimized: ${(optimized.originalSize / 1024).toFixed(1)}KB → ${(optimized.optimizedSize / 1024).toFixed(1)}KB (${optimized.compressionRatio.toFixed(1)}% reduction)`,
      );

      const bytes = new Uint8Array(await optimized.file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes).withUploadProgress(
        (percentage) => {
          setUploadProgress(percentage);
        },
      );
      setProfilePicture(blob);

      // Create preview from optimized file
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(optimized.file);
    } catch (error) {
      console.error("Error optimizing avatar:", error);
      setImageError(true);
      setTimeout(() => setImageError(false), 3000);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !displayName.trim()) {
      return;
    }

    try {
      await saveProfile.mutateAsync({
        username: username.trim(),
        displayName: displayName.trim(),
        bio: bio.trim(),
        profilePicture,
        followers: currentProfile.followers,
        following: currentProfile.following,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onOpenChange(false);
      }, 1500);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const isSubmitting = saveProfile.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-light">
            Edit Profile
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center">
            <label
              htmlFor="profile-picture"
              className={`cursor-pointer ${isOptimizing ? "opacity-50 pointer-events-none" : ""}`}
            >
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Profile"
                  className={`h-24 w-24 rounded-full object-cover ring-2 transition-all ${
                    imageError ? "ring-red-500" : "ring-border hover:ring-4"
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

          {uploadProgress > 0 && uploadProgress < 100 && (
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

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              className="rounded-xl"
              required
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="resize-none rounded-xl"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || isOptimizing}
            className={`w-full rounded-full transition-all ${
              showSuccess
                ? "bg-green-500 hover:bg-green-600"
                : "bg-foreground text-background hover:bg-foreground/90"
            }`}
          >
            {showSuccess ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Profile Updated!
              </>
            ) : isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
