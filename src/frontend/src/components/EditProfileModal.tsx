import type { UserProfile } from "../types";
import ProfileSetupModal from "./ProfileSetupModal";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProfile: UserProfile;
}

/**
 * Profile editor. Reuses ProfileSetupModal in edit mode so the look,
 * spacing, animations and inputs match the first-time setup screen exactly.
 */
export default function EditProfileModal({
  open,
  onOpenChange,
  currentProfile,
}: EditProfileModalProps) {
  if (!open) return null;
  return (
    <ProfileSetupModal
      currentProfile={currentProfile}
      onClose={() => onOpenChange(false)}
    />
  );
}
