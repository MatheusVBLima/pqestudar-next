"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  profileFormFromRow,
  type EligibilityProfileFormValues,
  type EligibilityProfileRow,
} from "@/lib/benefit-eligibility/profile-form";
import { eligibilityPersistenceErrorMessage, persistEligibilityProfile, ProfilePreferencePersistenceError } from "@/lib/benefit-eligibility/profile-persistence";

type PreferenceRow = Database["public"]["Tables"]["eligibility_profile_preferences"]["Row"];

export function useEligibilityProfile() {
  const { user, loading: authLoading } = useAuth();
  const [activeProfile, setActiveProfile] = useState<EligibilityProfileRow | null>(null);
  const [preference, setPreference] = useState<PreferenceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setActiveProfile(null);
      setPreference(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data: preferenceRow, error: preferenceError } = await supabase
      .from("eligibility_profile_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (preferenceError) {
      setError(preferenceError.message);
      setLoading(false);
      return;
    }

    let profileRow: EligibilityProfileRow | null = null;
    if (preferenceRow?.active_profile_id) {
      const { data, error: profileError } = await supabase
        .from("eligibility_profiles")
        .select("*")
        .eq("id", preferenceRow.active_profile_id)
        .maybeSingle();
      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
      profileRow = data;
    }
    if (!profileRow) {
      const { data, error: fallbackError } = await supabase
        .from("eligibility_profiles")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (fallbackError) {
        setError(fallbackError.message);
        setLoading(false);
        return;
      }
      profileRow = data;
    }
    setPreference(preferenceRow);
    setActiveProfile(profileRow);
    setLoading(false);
  }, [authLoading, user]);

  useEffect(() => { void load(); }, [load]);

  const saveProfile = async (values: EligibilityProfileFormValues): Promise<EligibilityProfileRow> => {
    if (!user) throw new Error("É necessário entrar na conta para salvar o perfil.");
    setSaving(true);
    setError(null);
    try {
      const data = await persistEligibilityProfile({
        userId: user.id,
        existingProfile: activeProfile,
        values,
        port: {
          create: async (payload) => {
            const { data: created, error: createError } = await supabase.from("eligibility_profiles").insert(payload).select("*").single();
            if (createError) throw createError;
            return created;
          },
          update: async (id, payload) => {
            const { data: updated, error: updateError } = await supabase.from("eligibility_profiles").update(payload).eq("id", id).select("*").single();
            if (updateError) throw updateError;
            return updated;
          },
          savePreference: async ({ userId, activeProfileId, enabled }) => {
            const { data: savedPreference, error: preferenceError } = await supabase
              .from("eligibility_profile_preferences")
              .upsert({ user_id: userId, active_profile_id: activeProfileId, profile_filter_enabled: enabled, updated_at: new Date().toISOString() }, { onConflict: "user_id" })
              .select("*")
              .single();
            if (preferenceError) throw preferenceError;
            setPreference(savedPreference);
          },
        },
      });
      setActiveProfile(data);
      return data;
    } catch (caught) {
      if (caught instanceof ProfilePreferencePersistenceError) setActiveProfile(caught.savedProfile);
      const message = eligibilityPersistenceErrorMessage(caught, "save");
      setError(message);
      throw caught;
    } finally {
      setSaving(false);
    }
  };

  const setFilterEnabled = async (enabled: boolean): Promise<void> => {
    if (!user) throw new Error("É necessário entrar na conta para usar um perfil.");
    if (enabled && !activeProfile) throw new Error("Crie um perfil antes de ativar o filtro.");
    setSaving(true);
    setError(null);
    try {
      const { data, error: preferenceError } = await supabase
        .from("eligibility_profile_preferences")
        .upsert({
          user_id: user.id,
          active_profile_id: activeProfile?.id ?? preference?.active_profile_id ?? null,
          profile_filter_enabled: enabled,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        .select("*")
        .single();
      if (preferenceError) throw preferenceError;
      setPreference(data);
    } catch (caught) {
      const message = eligibilityPersistenceErrorMessage(caught, "preference");
      setError(message);
      throw new Error(message, { cause: caught });
    } finally {
      setSaving(false);
    }
  };

  return {
    activeProfile,
    activeProfileForm: activeProfile ? profileFormFromRow(activeProfile) : null,
    filterEnabled: preference?.profile_filter_enabled === true && !!activeProfile,
    loading,
    saving,
    error,
    reload: load,
    saveProfile,
    setFilterEnabled,
  };
}
