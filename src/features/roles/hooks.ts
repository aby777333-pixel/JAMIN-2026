import { useMutation, useQuery } from '@tanstack/react-query';

import * as api from './api';

export function useSelectableRoles() {
  return useQuery({ queryKey: ['selectable-roles'], queryFn: api.getSelectableRoles, staleTime: 5 * 60_000 });
}

export function useSwitchRole() {
  return useMutation({ mutationFn: api.switchRole });
}
