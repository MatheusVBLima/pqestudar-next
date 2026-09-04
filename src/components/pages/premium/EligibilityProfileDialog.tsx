"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAZIL_STATES, fetchBrazilMunicipalities, MUNICIPALITIES_ERROR_MESSAGE, type BrazilMunicipality } from "@/lib/brazil-locations";
import {
  EMPTY_PROFILE_FORM,
  normalizeProfileForm,
  validateProfileStep,
  type EligibilityProfileFormValues,
} from "@/lib/benefit-eligibility/profile-form";
import type { EducationNetwork, EmploymentStatus, ProfileCondition, StudentStatus, TriState } from "@/lib/benefit-eligibility/types";
import { cn } from "@/lib/utils";

const STEPS = ["Localização", "Perfil básico", "Estudo e trabalho", "Condições relevantes"];
const EMPTY_VALUE = "__not_informed__";

const STUDENT_OPTIONS: Array<[StudentStatus, string]> = [
  ["not_student", "Não estuda"], ["basic_education", "Educação básica"],
  ["technical", "Curso técnico"], ["higher_education", "Ensino superior"], ["free_course", "Curso livre"],
];
const NETWORK_OPTIONS: Array<[EducationNetwork, string]> = [["public", "Pública"], ["private", "Privada"], ["mixed", "Mista/outra"]];
const EMPLOYMENT_OPTIONS: Array<[EmploymentStatus, string]> = [
  ["unemployed", "Desempregado"], ["formal_worker", "Trabalhador formal"],
  ["informal_worker", "Trabalhador informal"], ["self_employed", "Autônomo"],
  ["public_servant", "Servidor público"], ["retired_or_pensioner", "Aposentado ou pensionista"],
  ["not_working", "Não trabalha"],
];
const CONDITION_OPTIONS: Array<[ProfileCondition, string]> = [
  ["disability", "Pessoa com deficiência"], ["pregnant", "Gestante"],
  ["guardian_of_minor", "Responsável por criança ou adolescente"], ["artisan", "Artesão"],
  ["artisanal_fisher", "Pescador artesanal"], ["rural_worker", "Trabalhador ou produtor rural"],
];

interface EligibilityProfileDialogProps {
  open: boolean;
  initialValues?: EligibilityProfileFormValues | null;
  saving: boolean;
  error?: string | null;
  onCancel: () => void;
  onSave: (values: EligibilityProfileFormValues) => Promise<void>;
}

export function EligibilityProfileDialog({ open, initialValues, saving, error, onCancel, onSave }: EligibilityProfileDialogProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<EligibilityProfileFormValues>(EMPTY_PROFILE_FORM);
  const [initialSnapshot, setInitialSnapshot] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [municipalities, setMunicipalities] = useState<BrazilMunicipality[]>([]);
  const [municipalitiesLoading, setMunicipalitiesLoading] = useState(false);
  const [municipalitiesError, setMunicipalitiesError] = useState<string | null>(null);
  const [municipalitiesRetry, setMunicipalitiesRetry] = useState(0);

  useEffect(() => {
    if (!open) return;
    const next = normalizeProfileForm(initialValues ?? EMPTY_PROFILE_FORM);
    setValues(next);
    setInitialSnapshot(JSON.stringify(next));
    setStep(0);
    setValidationError(null);
  }, [initialValues, open]);

  useEffect(() => {
    if (!open || !values.stateCode) {
      setMunicipalities([]);
      setMunicipalitiesLoading(false);
      setMunicipalitiesError(null);
      return;
    }
    const controller = new AbortController();
    let current = true;
    setMunicipalitiesLoading(true);
    setMunicipalitiesError(null);
    fetchBrazilMunicipalities(values.stateCode, controller.signal)
      .then((items) => { if (current) setMunicipalities(items); })
      .catch((caught: unknown) => {
        if (!current || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setMunicipalities([]);
        setMunicipalitiesError(MUNICIPALITIES_ERROR_MESSAGE);
      })
      .finally(() => { if (current) setMunicipalitiesLoading(false); });
    return () => {
      current = false;
      controller.abort();
    };
  }, [open, values.stateCode, municipalitiesRetry]);

  const normalized = useMemo(() => normalizeProfileForm(values), [values]);
  const dirty = JSON.stringify(normalized) !== initialSnapshot;
  const requestCancel = () => {
    if (saving) return;
    if (dirty && !window.confirm("Descartar as alterações deste perfil?")) return;
    onCancel();
  };
  const update = <K extends keyof EligibilityProfileFormValues>(key: K, value: EligibilityProfileFormValues[K]) => {
    setValues((current) => normalizeProfileForm({ ...current, [key]: value }));
    setValidationError(null);
  };
  const changeState = (value: string) => {
    setMunicipalities([]);
    setMunicipalitiesError(null);
    setValues((current) => normalizeProfileForm({
      ...current,
      stateCode: value === EMPTY_VALUE ? null : value,
      municipalityName: null,
      municipalityIbgeCode: null,
    }));
    setValidationError(null);
  };
  const continueStep = () => {
    const message = validateProfileStep(normalized, step);
    if (message) {
      setValidationError(message);
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };
  const submit = async () => {
    const message = validateProfileStep(normalized, step);
    if (message) {
      setValidationError(message);
      return;
    }
    await onSave(normalized);
  };
  const toggleCondition = (condition: ProfileCondition, checked: boolean) => {
    const current = values.conditions ?? [];
    update("conditions", checked ? [...new Set([...current, condition])] : current.filter((item) => item !== condition));
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) requestCancel(); }}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-2xl flex-col overflow-hidden p-0" onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader className="px-5 pt-5 sm:px-6 sm:pt-6">
          <DialogTitle>{initialValues ? "Editar perfil" : "Conte um pouco sobre este perfil"}</DialogTitle>
          <DialogDescription>As informações ajudam a identificar benefícios que podem ser relevantes. Todos os campos são opcionais.</DialogDescription>
          <div className="space-y-2 pt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Etapa {step + 1} de {STEPS.length}</span><span>{STEPS[step]}</span></div>
            <Progress value={((step + 1) / STEPS.length) * 100} className="h-1.5" />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
          {step === 0 && (
            <div className="space-y-5">
              <div><h3 className="font-semibold">Onde este perfil mora?</h3><p className="text-sm text-muted-foreground">A localização permite comparar benefícios nacionais e regionais.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Estado</Label><Select value={values.stateCode ?? EMPTY_VALUE} onValueChange={changeState}><SelectTrigger><SelectValue placeholder="Não informado" /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>Prefiro não informar</SelectItem>{BRAZIL_STATES.map(([code, name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Município</Label><Select disabled={!values.stateCode || municipalitiesLoading || !!municipalitiesError} value={values.municipalityIbgeCode ?? EMPTY_VALUE} onValueChange={(value) => { const municipality = municipalities.find((item) => String(item.id) === value); update("municipalityIbgeCode", municipality ? String(municipality.id) : null); update("municipalityName", municipality?.nome ?? null); }}><SelectTrigger>{municipalitiesLoading ? <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando...</span> : <SelectValue placeholder="Não informado" />}</SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>Prefiro não informar</SelectItem>{municipalities.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.nome}</SelectItem>)}</SelectContent></Select>{municipalitiesError && <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-destructive" role="alert">{municipalitiesError}</p><Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setMunicipalitiesRetry((current) => current + 1)}><RefreshCw className="mr-1 h-3 w-3" /> Tentar novamente</Button></div>}</div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div><h3 className="font-semibold">Informações básicas</h3><p className="text-sm text-muted-foreground">Preencha somente o que fizer sentido para esta consulta.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="profile-age">Idade</Label><Input id="profile-age" type="number" min={0} max={120} inputMode="numeric" value={values.ageYears ?? ""} onChange={(event) => update("ageYears", event.target.value === "" ? null : Number(event.target.value))} placeholder="Ex.: 24" /></div>
                <div className="space-y-2"><Label htmlFor="household-size">Pessoas no grupo familiar</Label><Input id="household-size" type="number" min={1} max={50} inputMode="numeric" value={values.householdSize ?? ""} onChange={(event) => update("householdSize", event.target.value === "" ? null : Number(event.target.value))} placeholder="Ex.: 4" /></div>
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="household-income">Renda mensal aproximada do grupo familiar</Label><Input id="household-income" type="number" min={0} step="0.01" inputMode="decimal" value={values.householdMonthlyIncome ?? ""} onChange={(event) => update("householdMonthlyIncome", event.target.value === "" ? null : Number(event.target.value))} placeholder="Ex.: 2400,00" /><p className="text-xs text-muted-foreground">A renda por pessoa será calculada; ela não será solicitada nem armazenada separadamente.</p></div>
              </div>
              <div className="space-y-2"><Label>Situação no Cadastro Único</Label><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{([["yes", "Sim"], ["no", "Não"], ["unknown", "Não sei"], [null, "Prefiro não informar"]] as Array<[TriState | null, string]>).map(([value, label]) => <button key={label} type="button" onClick={() => update("cadunicoStatus", value)} className={cn("rounded-lg border px-3 py-2 text-sm transition-colors", values.cadunicoStatus === value ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>{label}</button>)}</div></div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div><h3 className="font-semibold">Estudo e trabalho</h3><p className="text-sm text-muted-foreground">Essas respostas ajudam a reconhecer programas educacionais e profissionais.</p></div>
              <div className="space-y-2"><Label>Situação de estudo</Label><Select value={values.studentStatus ?? EMPTY_VALUE} onValueChange={(value) => update("studentStatus", value === EMPTY_VALUE ? null : value as StudentStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>Prefiro não informar</SelectItem>{STUDENT_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
              {values.studentStatus && values.studentStatus !== "not_student" && <div className="space-y-2"><Label>Rede de ensino</Label><Select value={values.educationNetwork ?? EMPTY_VALUE} onValueChange={(value) => update("educationNetwork", value === EMPTY_VALUE ? null : value as EducationNetwork)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>Prefiro não informar</SelectItem>{NETWORK_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>}
              <div className="space-y-2"><Label>Situação de trabalho</Label><Select value={values.employmentStatus ?? EMPTY_VALUE} onValueChange={(value) => update("employmentStatus", value === EMPTY_VALUE ? null : value as EmploymentStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value={EMPTY_VALUE}>Prefiro não informar</SelectItem>{EMPLOYMENT_OPTIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div><h3 className="font-semibold">Condições relevantes</h3><p className="text-sm text-muted-foreground">Esta etapa é opcional. Não solicitamos diagnóstico ou documento.</p></div>
              <div className="grid gap-2 sm:grid-cols-2">{CONDITION_OPTIONS.map(([value, label]) => <label key={value} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/50"><Checkbox checked={values.conditions?.includes(value) === true} onCheckedChange={(checked) => toggleCondition(value, checked === true)} /><span className="text-sm leading-5">{label}</span></label>)}</div>
              <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant={values.conditions?.length === 0 ? "secondary" : "outline"} onClick={() => update("conditions", [])}>Nenhuma dessas condições</Button><Button type="button" size="sm" variant={values.conditions === null ? "secondary" : "ghost"} onClick={() => update("conditions", null)}>Prefiro não informar</Button></div>
            </div>
          )}

          {(validationError || error) && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{validationError || error}</p>}
        </div>

        <DialogFooter className="border-t px-5 py-4 sm:px-6">
          <Button type="button" variant="ghost" onClick={requestCancel} disabled={saving}>Cancelar</Button>
          {step > 0 && <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)} disabled={saving}>Voltar</Button>}
          {step < STEPS.length - 1
            ? <Button type="button" onClick={continueStep}>Continuar</Button>
            : <Button type="button" onClick={() => void submit()} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{initialValues ? "Salvar alterações" : "Criar perfil"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
