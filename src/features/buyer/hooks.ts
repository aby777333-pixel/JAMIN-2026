import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as api from './api';
import type { PropertyFilters } from './types';

export function useProperties(filters: PropertyFilters) {
  return useQuery({
    queryKey: ['properties', filters],
    queryFn: () => api.listProperties(filters),
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => api.getProperty(id as string),
    enabled: !!id,
  });
}

export function useProjects() {
  return useQuery({ queryKey: ['projects'], queryFn: api.getProjects, staleTime: 5 * 60_000 });
}

export function useFeaturedProperties(limit = 8) {
  return useQuery({
    queryKey: ['featured-properties', limit],
    queryFn: () => api.getFeaturedProperties(limit),
    staleTime: 60_000,
  });
}

export function useProjectsWithCounts() {
  return useQuery({
    queryKey: ['projects-with-counts'],
    queryFn: api.getProjectsWithCounts,
    staleTime: 60_000,
  });
}

export function useProjectById(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api.getProjectById(id as string),
    enabled: !!id,
  });
}

export function usePropertyTypes() {
  return useQuery({
    queryKey: ['property_types'],
    queryFn: api.getPropertyTypes,
    staleTime: 5 * 60_000,
  });
}

export function useWishlistIds() {
  return useQuery({ queryKey: ['wishlist'], queryFn: api.getWishlistIds });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ propertyId, saved }: { propertyId: string; saved: boolean }) =>
      saved ? api.removeWishlist(propertyId) : api.addWishlist(propertyId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['wishlist'] });
      void qc.invalidateQueries({ queryKey: ['properties'] });
    },
  });
}

export function useBuyerForm() {
  return useQuery({ queryKey: ['form', 'buyer'], queryFn: api.getBuyerForm, staleTime: 5 * 60_000 });
}

export function useCreateEnquiry() {
  return useMutation({ mutationFn: api.createEnquiry });
}

export function useBookSiteVisit() {
  return useMutation({ mutationFn: api.bookSiteVisit });
}

export function useReserveProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reserveProperty,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['properties'] }),
  });
}
