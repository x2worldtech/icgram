import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Loader2 } from "lucide-react";
import { useState } from "react";
import { ExternalBlob } from "../backend";
import { useSaveCallerUserProfile } from "../hooks/useQueries";
import { optimizeAvatarImage, validateImage } from "../utils/imageOptimization";

export default function ProfileSetupModal() {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [profilePicture, setProfilePicture] = useState<ExternalBlob | null>(
    null,
  );
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [hasCustomImage, setHasCustomImage] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [formError, setFormError] = useState("");

  const saveProfile = useSaveCallerUserProfile();

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImage(file)) {
      setImageError(true);
      setTimeout(() => setImageError(false), 3000);
      return;
    }

    setIsOptimizing(true);

    try {
      const optimized = await optimizeAvatarImage(file);
      console.log(
        `Avatar optimized: ${(optimized.originalSize / 1024).toFixed(1)}KB → ${(optimized.optimizedSize / 1024).toFixed(1)}KB (${optimized.compressionRatio.toFixed(1)}% reduction)`,
      );

      const bytes = new Uint8Array(await optimized.file.arrayBuffer());
      const blob = ExternalBlob.fromBytes(bytes);
      setProfilePicture(blob);

      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreviewUrl(ev.target?.result as string);
        setHasCustomImage(true);
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
      setFormError("Please fill in all required fields");
      setTimeout(() => setFormError(""), 3000);
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
      console.error("Error creating profile:", error);
      setFormError("Error creating profile. Please try again.");
      setTimeout(() => setFormError(""), 3000);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#04060f] text-white">
      {/* ---------- Animated background (same vocabulary as login) ---------- */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 20% 0%, #0b1a3a 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, #0a1330 0%, transparent 55%), linear-gradient(180deg, #04060f 0%, #02030a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(96,165,250,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(96,165,250,0.08) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, rgba(0,0,0,1) 0%, rgba(0,0,0,0.35) 55%, transparent 80%)",
          animation: "icgram-grid-pan 40s linear infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(59,130,246,0.5) 0%, rgba(59,130,246,0) 60%)",
          filter: "blur(60px)",
          animation: "icgram-orb-1 22s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -right-40 top-1/3 h-[520px] w-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(37,99,235,0.42) 0%, rgba(37,99,235,0) 60%)",
          filter: "blur(70px)",
          animation: "icgram-orb-2 26s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-40 left-1/4 h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(96,165,250,0.32) 0%, rgba(96,165,250,0) 65%)",
          filter: "blur(80px)",
          animation: "icgram-orb-3 30s ease-in-out infinite",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* ---------- Content ---------- */}
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col items-stretch justify-center px-6 py-12">
        {/* Header */}
        <div
          className="mb-10 text-center"
          style={{
            animation:
              "icgram-fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.05s both",
          }}
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-300/80">
            Welcome to ICgram
          </p>
          <h1
            className="mt-3 bg-gradient-to-b from-white via-white to-blue-200 bg-clip-text pb-1 text-4xl font-bold tracking-tight text-transparent"
            style={{ letterSpacing: "-0.035em" }}
          >
            Create your profile
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Tell the community who you are
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
          style={{
            animation:
              "icgram-fade-up 0.9s cubic-bezier(0.22,1,0.36,1) 0.15s both",
          }}
        >
          {/* Avatar picker */}
          <div className="flex flex-col items-center gap-3">
            <label
              htmlFor="profile-picture"
              className={`group relative cursor-pointer ${
                isOptimizing ? "pointer-events-none opacity-60" : ""
              }`}
            >
              {/* Soft glow behind the avatar */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                  background:
                    "radial-gradient(circle at center, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0) 70%)",
                  filter: "blur(24px)",
                  transform: "scale(1.6)",
                }}
              />
              <div className="relative h-28 w-28 overflow-hidden rounded-full ring-1 ring-white/15">
                {hasCustomImage ? (
                  <img
                    src={previewUrl}
                    alt="Profile"
                    className={`h-full w-full object-cover transition-all duration-300 group-hover:scale-105 ${
                      imageError ? "ring-2 ring-red-500" : ""
                    }`}
                  />
                ) : (
                  // Placeholder: blue gradient + camera icon, no PNG
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      background:
                        "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0b1226 100%)",
                    }}
                  >
                    <Camera className="h-9 w-9 text-blue-200/80 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                )}
                {isOptimizing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Loader2 className="h-7 w-7 animate-spin text-blue-300" />
                  </div>
                )}
                {/* Hover ring */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-blue-400/0 transition-all duration-300 group-hover:ring-blue-400/60"
                />
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
            <p className="text-xs text-slate-500">
              {hasCustomImage ? "Tap to change photo" : "Add a profile photo"}
            </p>
          </div>

          {formError && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
              {formError}
            </div>
          )}

          {/* Username */}
          <div className="space-y-2">
            <Label
              htmlFor="username"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="@username"
              required
              disabled={saveProfile.isPending}
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white placeholder:text-slate-500 focus-visible:border-blue-400/60 focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-0"
            />
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label
              htmlFor="displayName"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              required
              disabled={saveProfile.isPending}
              className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-base text-white placeholder:text-slate-500 focus-visible:border-blue-400/60 focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-0"
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label
              htmlFor="bio"
              className="text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Bio
            </Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
              disabled={saveProfile.isPending}
              className="resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base text-white placeholder:text-slate-500 focus-visible:border-blue-400/60 focus-visible:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-0"
            />
          </div>

          {/* Submit */}
          <div className="mt-2">
            <Button
              type="submit"
              disabled={saveProfile.isPending || isOptimizing}
              size="lg"
              className="relative h-12 w-full overflow-hidden rounded-full border-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 text-base font-semibold text-white shadow-[0_10px_30px_-8px_rgba(59,130,246,0.55),inset_0_1px_0_0_rgba(255,255,255,0.2)] transition-all duration-300 hover:translate-y-[-1px] hover:from-blue-500 hover:via-blue-400 hover:to-blue-600 hover:shadow-[0_14px_40px_-8px_rgba(59,130,246,0.75),inset_0_1px_0_0_rgba(255,255,255,0.25)] active:translate-y-0 disabled:translate-y-0 disabled:opacity-80"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
                style={{
                  animation: "icgram-shimmer 4.8s ease-in-out infinite 0.4s",
                }}
              />
              {saveProfile.isPending ? (
                <span className="relative flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating profile...
                </span>
              ) : (
                <span className="relative">Create Profile</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
