import type { Database } from "@/integrations/supabase/types";
import type { EducationNetwork, EligibilityProfile, EmploymentStatus, ProfileCondition, StudentStatus, TriState } from "./types";

export type EligibilityProfileRow = Database["public"]["Tables"]["eligibility_profiles"]["Row"];
export type EligibilityProfileInsert = Database["public"]["Tables"]["eligibility_profiles"]["Insert"];

export interface EligibilityProfileFormValues {
  label: string;
  stateCode: string | null;
  municipalityName: string | null;
  municipalityIbgeCode: string | null;
  ageYears: number | null;
  householdMonthlyIncome: number | null;
  householdSize: number | null;
  cadunicoFamilySize: number | null;
  cadunicoStatus: TriState | null;
  studentStatus: StudentStatus | null;
  educationNetwork: EducationNetwork | null;
  employmentStatus: EmploymentStatus | null;
  conditions: ProfileCondition[] | null;
}

export const EMPTY_PROFILE_FORM: EligibilityProfileFormValues = {
  label: "Perfil principal",
  stateCode: null,
  municipalityName: null,
  municipalityIbgeCode: null,
  ageYears: null,
  householdMonthlyIncome: null,
  householdSize: null,
  cadunicoFamilySize: null,
  cadunicoStatus: null,
  studentStatus: null,
  educationNetwork: null,
  employmentStatus: null,
  conditions: null,
};

export function normalizeProfileForm(values: EligibilityProfileFormValues): EligibilityProfileFormValues {
  const stateCode = values.stateCode?.trim().toUpperCase() || null;
  const studentStatus = values.studentStatus ?? null;
  return {
    ...values,
    label: values.label.trim() || "Perfil principal",
    stateCode,
    municipalityName: stateCode ? values.municipalityName?.trim() || null : null,
    municipalityIbgeCode: stateCode ? values.municipalityIbgeCode?.trim() || null : null,
    ageYears: values.ageYears == null ? null : Math.trunc(values.ageYears),
    householdMonthlyIncome: values.householdMonthlyIncome == null ? null : Number(values.householdMonthlyIncome),
    householdSize: values.householdSize == null ? null : Math.trunc(values.householdSize),
    cadunicoFamilySize: values.cadunicoStatus === "yes" && values.cadunicoFamilySize != null ? Math.trunc(values.cadunicoFamilySize) : null,
    cadunicoStatus: values.cadunicoStatus ?? null,
    studentStatus,
    educationNetwork: !studentStatus || studentStatus === "not_student" ? null : values.educationNetwork ?? null,
    employmentStatus: values.employmentStatus ?? null,
    conditions: values.conditions == null ? null : [...new Set(values.conditions)],
  };
}

export function validateProfileStep(values: EligibilityProfileFormValues, step: number): string | null {
  if (step === 0 && values.municipalityIbgeCode && !values.stateCode) return "Selecione o estado antes do município.";
  if (step === 1) {
    if (values.ageYears != null && (!Number.isInteger(values.ageYears) || values.ageYears < 0 || values.ageYears > 120)) return "Informe uma idade entre 0 e 120 anos.";
    if (values.householdSize != null && (!Number.isInteger(values.householdSize) || values.householdSize < 1 || values.householdSize > 50)) return "A quantidade de pessoas deve estar entre 1 e 50.";
    if (values.cadunicoFamilySize != null && (!Number.isInteger(values.cadunicoFamilySize) || values.cadunicoFamilySize < 1 || values.cadunicoFamilySize > 50)) return "A quantidade de pessoas no CadÚnico deve estar entre 1 e 50.";
    if (values.householdMonthlyIncome != null && values.householdMonthlyIncome < 0) return "A renda familiar não pode ser negativa.";
  }
  return null;
}

export function profileFormFromRow(row: EligibilityProfileRow): EligibilityProfileFormValues {
  return normalizeProfileForm({
    label: row.label,
    stateCode: row.state_code,
    municipalityName: row.municipality_name,
    municipalityIbgeCode: row.municipality_ibge_code,
    ageYears: row.age_years,
    householdMonthlyIncome: row.household_monthly_income,
    householdSize: row.household_size,
    cadunicoFamilySize: row.cadunico_family_size ?? null,
    cadunicoStatus: row.cadunico_status as TriState | null,
    studentStatus: row.student_status as StudentStatus | null,
    educationNetwork: row.education_network as EducationNetwork | null,
    employmentStatus: row.employment_status as EmploymentStatus | null,
    conditions: row.conditions as ProfileCondition[] | null,
  });
}

export function eligibilityProfileFromRow(row: EligibilityProfileRow): EligibilityProfile {
  return {
    id: row.id,
    label: row.label,
    ageYears: row.age_years,
    ageRecordedAt: row.age_recorded_at,
    birthDate: row.birth_date,
    stateCode: row.state_code,
    municipalityIbgeCode: row.municipality_ibge_code,
    householdMonthlyIncome: row.household_monthly_income,
    householdSize: row.household_size,
    cadunicoFamilySize: row.cadunico_status === "yes" ? row.cadunico_family_size ?? null : null,
    cadunicoStatus: row.cadunico_status as TriState | null,
    studentStatus: row.student_status as StudentStatus | null,
    educationNetwork: row.education_network as EducationNetwork | null,
    employmentStatus: row.employment_status as EmploymentStatus | null,
    conditions: row.conditions as ProfileCondition[] | null,
  };
}

export function profileInsertFromForm(
  values: EligibilityProfileFormValues,
  ownerUserId: string,
  today = new Date(),
  previous?: Pick<EligibilityProfileRow, "age_years" | "age_recorded_at"> | null,
): EligibilityProfileInsert {
  const normalized = normalizeProfileForm(values);
  const ageRecordedAt = normalized.ageYears == null
    ? null
    : previous?.age_years === normalized.ageYears && previous.age_recorded_at
      ? previous.age_recorded_at
      : today.toISOString().slice(0, 10);
  return {
    owner_user_id: ownerUserId,
    label: normalized.label,
    state_code: normalized.stateCode,
    municipality_name: normalized.municipalityName,
    municipality_ibge_code: normalized.municipalityIbgeCode,
    age_years: normalized.ageYears,
    age_recorded_at: ageRecordedAt,
    household_monthly_income: normalized.householdMonthlyIncome,
    household_size: normalized.householdSize,
    cadunico_family_size: normalized.cadunicoFamilySize,
    cadunico_status: normalized.cadunicoStatus,
    student_status: normalized.studentStatus,
    education_network: normalized.educationNetwork,
    employment_status: normalized.employmentStatus,
    conditions: normalized.conditions,
    updated_at: today.toISOString(),
  };
}
