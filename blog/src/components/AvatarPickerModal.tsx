import React, { useState, useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import {
  lorelei,
  avataaars,
  bottts,
  funEmoji,
  micah,
  personas,
  adventurer,
  thumbs,
  openPeeps,
  pixelArt,
  notionists,
  bigSmile,
  croodles,
  miniavs,
  dylan,
  toonHead,
} from '@dicebear/collection';
import { CloseCircle, GalleryExport, TickCircle } from 'iconsax-react';

interface AvatarPickerModalProps {
  currentAvatar?: string | null;
  onClose: () => void;
  onSelect: (base64Avatar: string) => Promise<void> | void;
}

// 16 avatar definitions using DiceBear styles and seeds
const AVATAR_STYLES = [
  { style: lorelei, seed: 'Felix', label: 'Lorelei 1' },
  { style: avataaars, seed: 'Aneka', label: 'Avataaars 1' },
  { style: funEmoji, seed: 'Sparkles', label: 'Emoji 1' },
  { style: bottts, seed: 'Buster', label: 'Bot 1' },
  { style: micah, seed: 'Zoe', label: 'Micah 1' },
  { style: personas, seed: 'Maya', label: 'Persona 1' },
  { style: adventurer, seed: 'Oliver', label: 'Adventurer 1' },
  { style: thumbs, seed: 'Lucky', label: 'Thumb 1' },
  { style: openPeeps, seed: 'Sasha', label: 'Peep 1' },
  { style: pixelArt, seed: 'Pixel', label: 'Pixel 1' },
  { style: notionists, seed: 'Alex', label: 'Notionist 1' },
  { style: bigSmile, seed: 'Joy', label: 'Smile 1' },
  { style: croodles, seed: 'Doodle', label: 'Croodle 1' },
  { style: miniavs, seed: 'Mini', label: 'Mini 1' },
  { style: dylan, seed: 'Dylan', label: 'Dylan 1' },
  { style: toonHead, seed: 'Toon', label: 'Toon 1' },
];

/** Helper to generate base64 SVG Data URI from DiceBear avatar */
function getBase64Avatar(style: any, seed: string): string {
  const avatar = createAvatar(style, { seed, size: 128 });
  const svgString = avatar.toString();
  const base64 = window.btoa(unescape(encodeURIComponent(svgString)));
  return `data:image/svg+xml;base64,${base64}`;
}

export default function AvatarPickerModal({
  currentAvatar,
  onClose,
  onSelect,
}: AvatarPickerModalProps) {
  // Generate the array of exactly 16 DiceBear base64 avatars
  const avatarList = useMemo(() => {
    return AVATAR_STYLES.map((item, index) => ({
      id: `dicebear-${index}`,
      label: item.label,
      base64: getBase64Avatar(item.style, item.seed),
    }));
  }, []);

  const [selectedBase64, setSelectedBase64] = useState<string>(
    currentAvatar || avatarList[0].base64
  );
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [customFileError, setCustomFileError] = useState<string | null>(null);

  // Handle local picture file selection and conversion to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCustomFileError('Please select a valid image file (PNG, JPG, WEBP, SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setCustomFileError('Image file size must be less than 5MB');
      return;
    }

    setCustomFileError(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      if (base64Data) {
        setSelectedBase64(base64Data);
      }
      setIsUploading(false);
    };
    reader.onerror = () => {
      setCustomFileError('Failed to read file');
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!selectedBase64) return;
    setIsSaving(true);
    try {
      await onSelect(selectedBase64);
      onClose();
    } catch (err) {
      console.error('Failed to update avatar:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg h-[500px] w-full p-6 shadow-2xl relative border border-neutral-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">Choose Profile Picture</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Select one of 16 avatars or upload your own picture
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-neutral-400 hover:text-neutral-700 transition-colors p-1 rounded-lg hover:bg-neutral-100"
          >
            <CloseCircle size={24} variant="Linear" color="currentColor" />
          </button>
        </div>

        <div className="overflow-y-auto py-4 space-y-6 flex-1 pr-1">
          {/* Selected Avatar Preview */}
          <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200/80">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white border border-neutral-200 shadow-sm shrink-0 flex items-center justify-center">
              {selectedBase64 ? (
                <img
                  src={selectedBase64}
                  alt="Selected Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-neutral-200 animate-pulse" />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-neutral-900">Avatar Preview</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                This image will be stored as base64 in your profile
              </p>
            </div>
          </div>

          {/* 16 DiceBear Avatars Grid */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-3">
              DiceBear Avatars (16 Options)
            </label>
            <div className="grid grid-cols-4 gap-3">
              {avatarList.map((item) => {
                const isSelected = selectedBase64 === item.base64;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedBase64(item.base64)}
                    className={`relative group aspect-square rounded-xl p-2 border-2 transition-all flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 ${
                      isSelected
                        ? 'border-neutral-900 bg-neutral-100/80 shadow-md ring-2 ring-neutral-900/10 scale-[1.03]'
                        : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                  >
                    <img
                      src={item.base64}
                      alt={item.label}
                      className="w-full h-full object-contain"
                    />
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-neutral-900 text-white rounded-full p-0.5 shadow-sm">
                        <TickCircle size={14} variant="Bold" color="currentColor" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Local Picture Upload Option */}
          <div className="pt-2 border-t border-neutral-100">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Or Upload Local Picture
            </label>
            <label className="flex items-center justify-center gap-3 p-4 border-2 border-dashed border-neutral-300 hover:border-neutral-900 rounded-xl cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50">
              <GalleryExport size={22} variant="Linear" className="text-neutral-600" />
              <div className="text-left">
                <span className="text-sm font-medium text-neutral-900 block">
                  {isUploading ? 'Converting image...' : 'Choose a file from your device'}
                </span>
                <span className="text-xs text-neutral-500 block">
                  PNG, JPG, GIF or WEBP (Max 5MB)
                </span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </label>
            {customFileError && (
              <p className="text-xs text-red-600 font-medium mt-2">{customFileError}</p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-colors rounded-full"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="px-6 py-2 text-sm font-medium bg-neutral-900 text-white rounded-full hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSaving ? 'Saving...' : 'Save Avatar'}
          </button>
        </div>
      </div>
    </div>
  );
}
