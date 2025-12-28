"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { UpdateRestaurantSettingsInput } from "@/types/api"

export const restaurantSettingsKeys = {
    all: ["restaurant-settings"] as const,
    detail: () => [...restaurantSettingsKeys.all, "detail"] as const,
}

export function useRestaurantSettingsQuery() {
    return useQuery({
        queryKey: restaurantSettingsKeys.detail(),
        queryFn: () => api.restaurantSettings.get(),
        staleTime: 5 * 60 * 1000, // 5 minutes - settings rarely change
        gcTime: 10 * 60 * 1000, // 10 minutes
    })
}

export function useUpdateRestaurantSettings() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: UpdateRestaurantSettingsInput) =>
            api.restaurantSettings.update(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: restaurantSettingsKeys.all })
        },
    })
}
