import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/services/profileService';
import type { PrivacyPreferences, Profile } from '@/types';

export function useProfile() {
  return useQuery({ queryKey: ['profile'], queryFn: profileService.getProfile });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Pick<Profile, 'full_name' | 'phone'>>) =>
      profileService.updateProfile(patch),
    onSuccess: (p) => qc.setQueryData(['profile'], p),
  });
}

export function useUpdatePrivacy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: PrivacyPreferences) => profileService.updatePrivacy(prefs),
    onSuccess: (p) => qc.setQueryData(['profile'], p),
  });
}
