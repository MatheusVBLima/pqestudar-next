import { profileInsertFromForm, type EligibilityProfileFormValues, type EligibilityProfileInsert, type EligibilityProfileRow } from "./profile-form.ts";

export interface EligibilityProfilePersistencePort {
  create(payload: EligibilityProfileInsert): Promise<EligibilityProfileRow>;
  update(id: string, payload: EligibilityProfileInsert): Promise<EligibilityProfileRow>;
  savePreference(input: { userId: string; activeProfileId: string; enabled: boolean }): Promise<void>;
}

export type ProfileActivationAction = "open_dialog" | "enable" | "disable";

export class ProfilePreferencePersistenceError extends Error {
  readonly savedProfile: EligibilityProfileRow;

  constructor(savedProfile: EligibilityProfileRow, cause: unknown) {
    super("O perfil foi salvo, mas não foi possível ativá-lo. Tente novamente.", { cause });
    this.name = "ProfilePreferencePersistenceError";
    this.savedProfile = savedProfile;
  }
}

export function eligibilityPersistenceErrorMessage(caught: unknown, action: "save" | "preference"): string {
  if (caught instanceof ProfilePreferencePersistenceError) return caught.message;
  const detail = caught instanceof Error ? caught.message.toLowerCase() : "";
  if (detail.includes("failed to fetch") || detail.includes("network") || detail.includes("timeout")) {
    return "Não foi possível conectar ao servidor. Confira sua internet e tente novamente.";
  }
  if (detail.includes("jwt") || detail.includes("session") || detail.includes("not authenticated")) {
    return "Sua sessão expirou. Entre novamente para continuar.";
  }
  if (detail.includes("check constraint") || detail.includes("violates")) {
    return "Uma das informações não pôde ser validada. Revise os campos e tente novamente.";
  }
  return action === "save"
    ? "Não foi possível salvar o perfil. Tente novamente."
    : "Não foi possível atualizar o uso do perfil. Tente novamente.";
}

export function profileActivationAction(enabled: boolean, hasProfile: boolean): ProfileActivationAction {
  if (!enabled) return "disable";
  return hasProfile ? "enable" : "open_dialog";
}

export async function persistEligibilityProfile(input: {
  userId: string;
  existingProfile?: EligibilityProfileRow | null;
  values: EligibilityProfileFormValues;
  port: EligibilityProfilePersistencePort;
  now?: Date;
}): Promise<EligibilityProfileRow> {
  const payload = profileInsertFromForm(input.values, input.userId, input.now, input.existingProfile);
  const saved = input.existingProfile
    ? await input.port.update(input.existingProfile.id, payload)
    : await input.port.create(payload);
  try {
    await input.port.savePreference({ userId: input.userId, activeProfileId: saved.id, enabled: true });
  } catch (caught) {
    throw new ProfilePreferencePersistenceError(saved, caught);
  }
  return saved;
}
