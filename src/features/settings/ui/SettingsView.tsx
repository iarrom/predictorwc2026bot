"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  updateAvatar,
  updateDisplayName,
  updateNotificationSettings,
} from "@/features/settings/actions";
import { prepareImageForUpload } from "@/features/settings/lib/prepareImage";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

interface SettingsViewProps {
  displayName: string;
  photoUrl: string | null;
  notifyGoals: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function SettingsView({
  displayName,
  photoUrl,
  notifyGoals,
}: SettingsViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(displayName);
  const [avatarUrl, setAvatarUrl] = useState(photoUrl);
  const [notifyEnabled, setNotifyEnabled] = useState(notifyGoals);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [isNamePending, startNameTransition] = useTransition();
  const [isNotifyPending, startNotifyTransition] = useTransition();

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  useEffect(() => {
    setAvatarUrl(photoUrl);
  }, [photoUrl]);

  function handleAvatarPick() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProfileError(null);

    startProfileTransition(async () => {
      try {
        const prepared = await prepareImageForUpload(file);
        const formData = new FormData();
        formData.set(
          "avatar",
          new File([prepared], "avatar.jpg", {
            type: prepared.type || "image/jpeg",
          }),
        );

        const result = await updateAvatar(null, formData);
        if (result.error) {
          setProfileError(result.error);
          return;
        }

        if (result.photoUrl) {
          setAvatarUrl(result.photoUrl);
        }
        router.refresh();
      } catch (error) {
        setProfileError(
          error instanceof Error ? error.message : "Failed to upload avatar",
        );
      }
    });
  }

  function handleNameSave() {
    setNameError(null);
    setNameSuccess(false);

    startNameTransition(async () => {
      const formData = new FormData();
      formData.set("display_name", name);

      const result = await updateDisplayName(null, formData);
      if (result.error) {
        setNameError(result.error);
        return;
      }

      setNameSuccess(true);
      router.refresh();
    });
  }

  function handleToggle(checked: boolean) {
    setNotifyEnabled(checked);
    setNotifyError(null);

    startNotifyTransition(async () => {
      const formData = new FormData();
      formData.set("notify_goals", checked ? "true" : "false");

      const result = await updateNotificationSettings(null, formData);
      if (result.error) {
        setNotifyEnabled(!checked);
        setNotifyError(result.error);
      }
    });
  }

  const nameChanged = name.trim() !== displayName.trim();

  return (
    <div className="flex flex-col animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none">
      <div className="sports-panel corner-squircle sports-panel-max-h flex flex-col">
        <div className="shrink-0 border-b border-white/[0.08] px-4 py-3">
          <h1 className="text-[15px] font-semibold text-foreground">Settings</h1>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            Manage your profile and notification preferences
          </p>
        </div>

        <div className="px-4 py-4">
          <FieldGroup>
            <div className="space-y-1">
              <h2 className="text-[13px] font-medium text-foreground">Profile</h2>
              <p className="text-[11px] leading-snug text-muted-foreground">
                Update your display name and avatar. Custom values are kept after
                Telegram sign-in.
              </p>
            </div>

            <Field orientation="vertical">
              <FieldLabel>Avatar</FieldLabel>
              <div className="flex items-center gap-4">
                <Avatar size="lg" className="size-16">
                  <AvatarImage src={avatarUrl ?? undefined} alt={name} />
                  <AvatarFallback className="text-base">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.heic,.heif"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isProfilePending}
                    onClick={handleAvatarPick}
                  >
                    {isProfilePending ? "Uploading..." : "Change photo"}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    JPEG, PNG, WebP, or HEIC from iOS
                  </p>
                </div>
              </div>
              {profileError && <FieldError>{profileError}</FieldError>}
            </Field>

            <Field orientation="vertical">
              <FieldLabel htmlFor="display-name">Display name</FieldLabel>
              <div className="flex gap-2">
                <input
                  id="display-name"
                  type="text"
                  value={name}
                  maxLength={32}
                  disabled={isNamePending}
                  onChange={(event) => {
                    setName(event.target.value);
                    setNameSuccess(false);
                    setNameError(null);
                  }}
                  className="h-9 min-w-0 flex-1 rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={isNamePending || !nameChanged || !name.trim()}
                  onClick={handleNameSave}
                >
                  {isNamePending ? "Saving..." : "Save"}
                </Button>
              </div>
              {nameError && <FieldError>{nameError}</FieldError>}
              {nameSuccess && !nameError && (
                <p className="text-[11px] text-muted-foreground">
                  Name updated
                </p>
              )}
            </Field>

            <Separator className="bg-white/[0.08]" />

            <Field orientation="horizontal">
              <FieldContent>
                <FieldTitle>Goal notifications</FieldTitle>
                <FieldDescription>
                  Get a Telegram message when a goal is scored and the score
                  changes during live matches.
                </FieldDescription>
              </FieldContent>
              <FieldLabel htmlFor="notify-goals" className="sr-only">
                Goal notifications
              </FieldLabel>
              <Switch
                id="notify-goals"
                checked={notifyEnabled}
                disabled={isNotifyPending}
                onCheckedChange={handleToggle}
                aria-label="Goal notifications"
              />
            </Field>
            {notifyError && <FieldError>{notifyError}</FieldError>}
          </FieldGroup>
        </div>
      </div>
    </div>
  );
}
