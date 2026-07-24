import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactService } from '@/services/contactService';
import type { ContactInput } from '@/lib/validation';

export function useContacts() {
  return useQuery({ queryKey: ['contacts'], queryFn: contactService.list });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ContactInput) => contactService.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ContactInput }) =>
      contactService.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => contactService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contacts'] }),
  });
}
