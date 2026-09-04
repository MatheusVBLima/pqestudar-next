"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { GeoJsonObject } from "geojson";
import { ChevronDown, Eye, Gift, LocateFixed, Loader2, MapPin, Pencil, Search, SlidersHorizontal, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PremiumBackButton } from "@/components/premium/PremiumBackButton";
import { EligibilityProfileDialog } from "@/components/pages/premium/EligibilityProfileDialog";
import { CompatibilityBadge, CompatibilityExplanation } from "@/components/pages/premium/BenefitCompatibility";
import { useBenefitEligibilityCriteria } from "@/hooks/useBenefitEligibilityCriteria";
import { useEligibilityProfile } from "@/hooks/useEligibilityProfile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { profileActivationAction } from "@/lib/benefit-eligibility/profile-persistence";
import { eligibilityProfileFromRow } from "@/lib/benefit-eligibility/profile-form";
import { evaluateBenefitCollection, filterBenefitCollection, sortBenefitsNormally, sortEvaluatedBenefits } from "@/lib/benefit-eligibility/collection";
import type { BenefitCompatibilityResult, CoverageEvaluation, EligibilityProfile } from "@/lib/benefit-eligibility/types";
import { cn } from "@/lib/utils";

type Benefit = {
  id: string;
  title: string;
  category: string;
  scope: string;
  description: string;
  boundaryPath: string;
  sourceUrl: string;
  detailPath?: string;
  center: LatLngExpression;
  zoom?: number;
  coverages?: Coverage[];
  locations: Array<{ name: string; address: string; position: LatLngExpression; coverage?: string }>;
};

type Coverage = {
  label: string;
  level: "national" | "state" | "district" | "municipal";
  boundaryPath: string;
  center: [number, number];
  zoom: number;
  stateCode?: string | null;
  municipalityIbgeCode?: string | null;
};

const FORTALEZA_COVERAGE: Coverage = { label: "Fortaleza, CE", level: "municipal", boundaryPath: "/data/fortaleza-limite.geojson", center: [-3.755, -38.525], zoom: 11 };
const DISTRITO_FEDERAL_COVERAGE: Coverage = { label: "Distrito Federal", level: "district", boundaryPath: "/data/distrito-federal-limite.geojson", center: [-15.79, -47.88], zoom: 9 };
const BRASIL_COVERAGE: Coverage = { label: "Brasil", level: "national", boundaryPath: "/data/brasil-limite.geojson", center: [-14.2, -51.9], zoom: 4 };
const COVERAGE_COLORS = ["#d946ef", "#06b6d4", "#f59e0b", "#22c55e", "#8b5cf6", "#ef4444", "#3b82f6"];

function coverageColor(index: number): string {
  return COVERAGE_COLORS[index % COVERAGE_COLORS.length];
}

function getBenefitCoverages(benefit: Benefit): Coverage[] {
  if (benefit.coverages?.length) return benefit.coverages;
  return [{
    label: benefit.scope,
    level: benefit.scope === "Brasil" ? "national" : benefit.scope === "Distrito Federal" ? "district" : "municipal",
    boundaryPath: benefit.boundaryPath,
    center: benefit.center as [number, number],
    zoom: benefit.zoom ?? 11,
  }];
}

const FALLBACK_BENEFITS: Benefit[] = [
  {
    id: "passe-livre",
    title: "Passe Livre Todo Dia",
    category: "Educação",
    scope: "Fortaleza, CE",
    description: "Duas passagens gratuitas por dia, durante os 365 dias do ano, para estudantes com carteira válida da Etufor.",
    boundaryPath: "/data/fortaleza-limite.geojson",
    sourceUrl: "https://www.fortaleza.ce.gov.br/noticias/prefeito-evandro-leitao-sanciona-passe-livre-todo-dia-ampliado-para-ferias-fins-de-semana-e-feriados",
    center: [-3.755, -38.525],
    locations: [
      { name: "Central de Atendimento", address: "Centro, Fortaleza – CE", position: [-3.728, -38.527] },
      { name: "Posto Antônio Bezerra", address: "Antônio Bezerra, Fortaleza – CE", position: [-3.737, -38.591] },
    ],
  },
  {
    id: "passe-livre-df",
    title: "Passe Livre Estudantil do DF",
    category: "Educação",
    scope: "Distrito Federal",
    description: "Gratuidade no transporte público para estudantes que atendam aos critérios do programa.",
    boundaryPath: "/data/distrito-federal-limite.geojson",
    sourceUrl: "https://www.semob.df.gov.br/sistema-de-cadastro-de-instituicoes-de-ensino/",
    center: [-15.79, -47.88],
    locations: [
      { name: "Galeria dos Estados", address: "Galeria dos Estados, Brasília – DF", position: [-15.8, -47.89] },
      { name: "Rodoviária do Plano Piloto", address: "Estação Central, Brasília – DF", position: [-15.794, -47.883] },
      { name: "Na Hora Ceilândia", address: "QNM 11, Área Especial 3, Ceilândia – DF", position: [-15.815, -48.108] },
    ],
  },
  {
    id: "df-social",
    title: "Programa DF Social",
    category: "Assistência social",
    scope: "Distrito Federal",
    description: "Transferência de renda para famílias de baixa renda inscritas no CadÚnico; a seleção não é uma solicitação direta.",
    boundaryPath: "/data/distrito-federal-limite.geojson",
    sourceUrl: "https://www.sedes.df.gov.br/programa-df-social",
    center: [-15.79, -47.88],
    locations: [
      { name: "CRAS Brasília", address: "Av. L2 Sul, SGAS 614/615, Brasília – DF", position: [-15.829, -47.907] },
      { name: "CRAS Ceilândia Norte", address: "QNN 15, Área Especial Módulo A, Ceilândia – DF", position: [-15.807, -48.116] },
    ],
  },
  {
    id: "cartao-gas-df",
    title: "Cartão Gás do DF",
    category: "Alimentação",
    scope: "Distrito Federal",
    description: "Benefício bimestral destinado a famílias em situação de vulnerabilidade social selecionadas pelo programa.",
    boundaryPath: "/data/distrito-federal-limite.geojson",
    sourceUrl: "https://www.sedes.df.gov.br/w/cartao-gas-completa-tres-anos-com-mais-de-r-125-milhoes-investidos",
    center: [-15.79, -47.88],
    locations: [
      { name: "CRAS Brasília", address: "Av. L2 Sul, SGAS 614/615, Brasília – DF", position: [-15.829, -47.907] },
      { name: "CRAS Ceilândia Norte", address: "QNN 15, Área Especial Módulo A, Ceilândia – DF", position: [-15.807, -48.116] },
    ],
  },
  {
    id: "tarifa-social-agua",
    title: "Tarifa Social de Água",
    category: "Desconto",
    scope: "Brasil",
    description: "Tarifa reduzida para famílias de baixa renda elegíveis, aplicada pela prestadora local conforme as regras vigentes.",
    boundaryPath: "/data/brasil-limite.geojson",
    sourceUrl: "https://www.gov.br/ana/pt-br/assuntos/saneamento-basico/tarifa-social-de-agua-e-esgoto/perguntas-frequentes",
    detailPath: "/premium/beneficios/tarifa-social-de-agua",
    center: [-14.2, -51.9],
    zoom: 4,
    coverages: [BRASIL_COVERAGE],
    locations: [],
  },
  {
    id: "farmacia-popular",
    title: "Programa Farmácia Popular",
    category: "Saúde",
    scope: "Brasil",
    description: "Medicamentos e insumos gratuitos em estabelecimentos credenciados identificados pelo programa.",
    boundaryPath: "/data/brasil-limite.geojson",
    sourceUrl: "https://www.gov.br/saude/pt-br/composicao/sectics/farmacia-popular",
    detailPath: "/premium/beneficios/programa-farmacia-popular",
    center: [-14.2, -51.9],
    zoom: 4,
    coverages: [BRASIL_COVERAGE],
    locations: [],
  },
  {
    id: "cras",
    title: "Centros de Referência de Assistência Social (CRAS)",
    category: "Assistência social",
    scope: "Fortaleza, CE e Distrito Federal",
    description: "Rede territorial de orientação e acesso ao CadÚnico, serviços e benefícios socioassistenciais.",
    boundaryPath: "/data/fortaleza-limite.geojson",
    sourceUrl: "https://acolhe.fortaleza.ce.gov.br/",
    detailPath: "/premium/beneficios/centros-de-referencia-de-assistencia-social-cras",
    center: [-3.755, -38.525],
    coverages: [FORTALEZA_COVERAGE, DISTRITO_FEDERAL_COVERAGE],
    locations: [
      { name: "CRAS Brasília", address: "Av. L2 Sul, SGAS 614/615, Brasília – DF", position: [-15.829, -47.907], coverage: "Distrito Federal" },
      { name: "CRAS Ceilândia Norte", address: "QNN 15, Área Especial Módulo A, Ceilândia – DF", position: [-15.807, -48.116], coverage: "Distrito Federal" },
    ],
  },
  {
    id: "gas-do-povo",
    title: "Gás do Povo (antigo Auxílio Gás)",
    category: "Assistência social",
    scope: "Brasil",
    description: "Vale para recarga gratuita do botijão destinado a famílias elegíveis do CadÚnico, conforme seleção e disponibilidade do programa.",
    boundaryPath: "/data/brasil-limite.geojson",
    sourceUrl: "https://www.gov.br/secom/pt-br/arquivos/faq-consolidado-programa-gas-do-povo",
    detailPath: "/premium/beneficios/auxilio-gas-vale-gas",
    center: [-14.2, -51.9],
    zoom: 4,
    locations: [],
  },
  {
    id: "id-jovem",
    title: "ID Jovem",
    category: "Educação e cultura",
    scope: "Brasil",
    description: "Meia-entrada e vagas gratuitas ou com desconto no transporte interestadual para jovens de baixa renda que atendam aos requisitos.",
    boundaryPath: "/data/brasil-limite.geojson",
    sourceUrl: "https://idjovem.juventude.gov.br/emitir-id-jovem",
    detailPath: "/premium/beneficios/id-jovem-identidade-jovem",
    center: [-14.2, -51.9],
    zoom: 4,
    locations: [],
  },
  {
    id: "bpc-loas",
    title: "Benefício de Prestação Continuada (BPC/LOAS)",
    category: "Assistência social",
    scope: "Brasil",
    description: "Benefício assistencial para pessoa idosa ou com deficiência que cumpra os critérios legais e socioeconômicos.",
    boundaryPath: "/data/brasil-limite.geojson",
    sourceUrl: "https://www.gov.br/inss/pt-br/servicos/beneficios-assistenciais",
    detailPath: "/premium/beneficios/beneficio-de-prestacao-continuada-bpc-loas",
    center: [-14.2, -51.9],
    zoom: 4,
    locations: [],
  },
  {
    id: "tarifa-social-energia",
    title: "Tarifa Social de Energia Elétrica",
    category: "Desconto",
    scope: "Brasil",
    description: "Benefício tarifário nacional para unidades consumidoras de famílias que atendam aos critérios de baixa renda ou situações previstas em lei.",
    boundaryPath: "/data/brasil-limite.geojson",
    sourceUrl: "https://www.gov.br/aneel/pt-br/assuntos/tarifas/tarifa-social",
    detailPath: "/premium/beneficios/tarifa-social-de-energia-eletrica",
    center: [-14.2, -51.9],
    zoom: 4,
    locations: [],
  },
  {
    id: "minha-casa-minha-vida",
    title: "Minha Casa, Minha Vida",
    category: "Moradia",
    scope: "Brasil",
    description: "Programa habitacional nacional com modalidades subsidiadas e financiadas; inscrições e ofertas locais dependem da modalidade e do ente responsável.",
    boundaryPath: "/data/brasil-limite.geojson",
    sourceUrl: "https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/habitacao/programa-minha-casa-minha-vida",
    detailPath: "/premium/beneficios/programa-minha-casa-minha-vida",
    center: [-14.2, -51.9],
    zoom: 4,
    locations: [],
  },
];

type CoverageRecord = {
  id: string;
  benefit_id: string;
  coverage_level: Coverage["level"];
  label: string;
  boundary_path: string;
  center_lat: number;
  center_lng: number;
  default_zoom: number;
  state_code: string | null;
  ibge_code: string | null;
  source_url: string | null;
  premium_items: {
    id: string;
    title: string;
    slug: string;
    description_short: string | null;
    tags: string[] | null;
  };
};

function categoryFromTags(tags: string[] | null): string {
  return tags?.find((tag) => tag !== "__benefit" && tag.toLocaleLowerCase("pt-BR") !== "benefício") ?? "Benefício";
}

function mapDatabaseBenefits(coverages: CoverageRecord[]): Benefit[] {
  const grouped = new Map<string, Benefit>();
  coverages.forEach((record) => {
    const item = record.premium_items;
    const coverage: Coverage = {
      label: record.label,
      level: record.coverage_level,
      boundaryPath: record.boundary_path,
      center: [record.center_lat, record.center_lng],
      zoom: record.default_zoom,
      stateCode: record.state_code,
      municipalityIbgeCode: record.ibge_code,
    };
    const current = grouped.get(item.id);
    if (current) {
      current.coverages?.push(coverage);
      current.scope = current.coverages?.map((entry) => entry.label).join(" e ") ?? current.scope;
      return;
    }
    grouped.set(item.id, {
      id: item.id,
      title: item.title,
      category: categoryFromTags(item.tags),
      scope: record.label,
      description: item.description_short ?? "Consulte os requisitos e a disponibilidade deste benefício.",
      boundaryPath: record.boundary_path,
      sourceUrl: record.source_url ?? "",
      detailPath: `/premium/beneficios/${item.slug}`,
      center: coverage.center,
      zoom: coverage.zoom,
      coverages: [coverage],
      locations: [],
    });
  });
  return [...grouped.values()];
}

function coverageLevelLabel(coverage: Coverage): string {
  return { national: "Nacional", state: "Estadual", district: "Distrital", municipal: "Municipal" }[coverage.level];
}

function territorialSpecificity(benefit: Benefit): number {
  const ranks = { national: 0, state: 2, district: 2, municipal: 3 };
  return Math.max(...getBenefitCoverages(benefit).map((coverage) => ranks[coverage.level]));
}

function evaluateCoverage(benefit: Benefit, profile: EligibilityProfile): CoverageEvaluation {
  const coverages = getBenefitCoverages(benefit);
  if (coverages.some((coverage) => coverage.level === "national")) {
    return { outcome: "match", message: "Disponível em todo o Brasil" };
  }
  if (!profile.stateCode && !profile.municipalityIbgeCode) {
    return { outcome: "unknown", message: "Localização do perfil não informada" };
  }
  const match = coverages.find((coverage) =>
    (profile.municipalityIbgeCode && coverage.municipalityIbgeCode === profile.municipalityIbgeCode)
    || (profile.stateCode && coverage.stateCode === profile.stateCode));
  return match
    ? { outcome: "match", message: `Disponível em ${match.label}` }
    : { outcome: "mismatch", message: "A cobertura cadastrada não inclui a localização deste perfil" };
}

function FocusCoverages({ coverages }: { coverages: Coverage[] }) {
  const map = useMap();
  useEffect(() => {
    if (coverages.length === 1) {
      map.flyTo(coverages[0].center, coverages[0].zoom, { duration: 0.8 });
      return;
    }
    map.fitBounds(coverages.map((coverage) => coverage.center), { padding: [48, 48], animate: true, duration: 0.8 });
  }, [coverages, map]);
  return null;
}

function FocusUserLocation({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 13, { duration: 0.9 });
  }, [map, position]);
  if (!position) return null;
  return <CircleMarker center={position} radius={8} pathOptions={{ color: "#fff", fillColor: "#2563eb", fillOpacity: 1, weight: 3 }}><Popup>Você está aqui</Popup></CircleMarker>;
}

export default function PremiumBenefitsMapNext() {
  const { toast } = useToast();
  const profile = useEligibilityProfile();
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [benefits, setBenefits] = useState<Benefit[]>(FALLBACK_BENEFITS);
  const [selectedId, setSelectedId] = useState(FALLBACK_BENEFITS[0].id);
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [region, setRegion] = useState("all");
  const [category, setCategory] = useState("all");
  const [selectedBoundaries, setSelectedBoundaries] = useState<Array<{ path: string; data: GeoJsonObject }>>([]);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const criteriaQuery = useBenefitEligibilityCriteria(benefits.map((benefit) => benefit.id), profile.filterEnabled && !!profile.activeProfile);
  const selected = benefits.find((item) => item.id === selectedId) ?? benefits[0];
  const regions = useMemo(() => [...new Set(benefits.flatMap(getBenefitCoverages).filter((coverage) => coverage.level !== "national").map((coverage) => coverage.label))].sort((a, b) => a.localeCompare(b, "pt-BR")), [benefits]);
  const categories = useMemo(() => [...new Set(benefits.map((benefit) => benefit.category))].sort((a, b) => a.localeCompare(b, "pt-BR")), [benefits]);
  const selectedCoverages = useMemo(() => getBenefitCoverages(selected), [selected]);
  const selectedCoverage = selectedCoverages.find((coverage) => coverage.label === region)
    ?? selectedCoverages.find((coverage) => coverage.level === "national")
    ?? selectedCoverages[0];
  const displayedCoverages = useMemo(() => region === "all" ? selectedCoverages : [selectedCoverage], [region, selectedCoverage, selectedCoverages]);
  const baseFiltered = useMemo(
    () => sortBenefitsNormally(filterBenefitCollection({ benefits, region, category, search, coveragesFor: getBenefitCoverages })),
    [benefits, category, region, search],
  );
  const compatibilityReady = profile.filterEnabled && !!profile.activeProfile && criteriaQuery.ready && !criteriaQuery.error;
  const evaluated = useMemo(() => {
    if (!compatibilityReady || !profile.activeProfile) return [];
    const domainProfile = eligibilityProfileFromRow(profile.activeProfile);
    return sortEvaluatedBenefits(evaluateBenefitCollection({
      benefits: baseFiltered.map((benefit) => ({ ...benefit, territorialSpecificity: territorialSpecificity(benefit) })),
      profile: domainProfile,
      criteria: criteriaQuery.criteria,
      verifications: criteriaQuery.verifications,
      coverageFor: (benefit) => evaluateCoverage(benefit, domainProfile),
    }));
  }, [baseFiltered, compatibilityReady, criteriaQuery.criteria, criteriaQuery.verifications, profile.activeProfile]);
  const compatibilityByBenefit = useMemo(() => new Map<string, BenefitCompatibilityResult>(evaluated.map((benefit) => [benefit.id, benefit.compatibility])), [evaluated]);
  const filtered = compatibilityReady ? evaluated : baseFiltered;
  const activeFilterCount = Number(region !== "all") + Number(category !== "all");

  useEffect(() => {
    let active = true;
    async function loadBenefits() {
      const { data: coverageRows, error: coverageError } = await supabase
        .from("benefit_coverages")
        .select("id, benefit_id, coverage_level, label, boundary_path, center_lat, center_lng, default_zoom, state_code, ibge_code, source_url, premium_items!inner(id, title, slug, description_short, tags)")
        .eq("is_active", true)
        .eq("premium_items.status", "published");
      if (coverageError || !coverageRows?.length) {
        if (coverageError) console.error("Não foi possível carregar as coberturas do mapa.", coverageError);
        return;
      }
      if (active) {
        const mapped = mapDatabaseBenefits(coverageRows as unknown as CoverageRecord[]);
        if (mapped.length) {
          setBenefits(mapped);
          setSelectedId(mapped[0].id);
        }
      }
    }
    void loadBenefits();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (filtered.length > 0 && !filtered.some((benefit) => benefit.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    let active = true;
    setSelectedBoundaries([]);
    Promise.all(displayedCoverages.map(async (coverage) => {
      const response = await fetch(coverage.boundaryPath);
      if (!response.ok) throw new Error(`Não foi possível carregar o limite de ${coverage.label}.`);
      return { path: coverage.boundaryPath, data: await response.json() as GeoJsonObject };
    }))
      .then((boundaries) => {
        if (active) setSelectedBoundaries(boundaries);
      })
      .catch((error: unknown) => console.error(error));
    return () => { active = false; };
  }, [displayedCoverages]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage("Seu navegador não oferece suporte à localização.");
      return;
    }
    setLocating(true);
    setLocationMessage("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position: [number, number] = [coords.latitude, coords.longitude];
        setUserPosition(position);
        const inFortaleza = coords.latitude >= -3.9 && coords.latitude <= -3.65 && coords.longitude >= -38.7 && coords.longitude <= -38.35;
        const inDistritoFederal = coords.latitude >= -16.1 && coords.latitude <= -15.45 && coords.longitude >= -48.35 && coords.longitude <= -47.25;
        if (inFortaleza) {
          setRegion("Fortaleza, CE");
          const localBenefit = benefits.find((benefit) => getBenefitCoverages(benefit).some((coverage) => coverage.label === "Fortaleza, CE" && coverage.level !== "national"));
          if (localBenefit) setSelectedId(localBenefit.id);
          setLocationMessage("Mostrando benefícios disponíveis em Fortaleza.");
        } else if (inDistritoFederal) {
          setRegion("Distrito Federal");
          const localBenefit = benefits.find((benefit) => getBenefitCoverages(benefit).some((coverage) => coverage.label === "Distrito Federal" && coverage.level !== "national"));
          if (localBenefit) setSelectedId(localBenefit.id);
          setLocationMessage("Mostrando benefícios disponíveis no Distrito Federal.");
        } else {
          setRegion("all");
          setLocationMessage("Localização encontrada, mas essa região ainda não está no piloto.");
        }
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setFiltersOpen(true);
          setLocationMessage("Localização bloqueada. Libere-a no cadeado do navegador ou escolha uma região nos filtros.");
          return;
        }
        setLocationMessage("Não foi possível obter sua localização. Escolha uma região nos filtros.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const toggleProfile = async (enabled: boolean) => {
    const action = profileActivationAction(enabled, !!profile.activeProfile);
    if (action === "open_dialog") {
      setProfileDialogOpen(true);
      return;
    }
    try {
      await profile.setFilterEnabled(action === "enable");
    } catch (caught) {
      toast({ title: "Não foi possível atualizar o perfil", description: caught instanceof Error ? caught.message : "Tente novamente.", variant: "destructive" });
    }
  };

  const saveProfile = async (values: Parameters<typeof profile.saveProfile>[0]) => {
    try {
      await profile.saveProfile(values);
      setProfileDialogOpen(false);
      toast({ title: profile.activeProfile ? "Perfil atualizado" : "Perfil criado", description: "As informações foram salvas com segurança." });
    } catch {
      // The hook exposes the persisted error inside the dialog.
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-[1504px] flex-col px-4 py-5 sm:px-6 lg:h-[calc(100dvh-80px)] lg:overflow-hidden lg:px-8">
      <div className="self-start"><PremiumBackButton fallbackPath="/premium" fallbackLabel="Premium" /></div>
      <div className="mb-4 mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Mapa de benefícios</h1>
            <Badge className="gap-1.5"><Gift className="h-3.5 w-3.5" /> Piloto Premium</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-muted-foreground">Veja em quais regiões cada benefício está disponível.</p>
        </div>
        <div className="flex flex-wrap items-start justify-end gap-3">
          <div className="rounded-xl border bg-card px-3 py-2 text-left">
            <div className="flex items-center gap-3">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="profile-filter" className="cursor-pointer text-sm font-medium">Usar perfil</label>
              {profile.loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Switch id="profile-filter" checked={profile.filterEnabled} disabled={profile.saving} onCheckedChange={(checked) => void toggleProfile(checked)} />}
            </div>
            {profile.activeProfile && (
              <div className="mt-1.5 flex items-center justify-between gap-3 pl-7 text-xs">
                <span className="text-muted-foreground">{profile.filterEnabled ? "Perfil ativo" : "Perfil salvo"}</span>
                <button type="button" onClick={() => setProfileDialogOpen(true)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline"><Pencil className="h-3 w-3" /> Editar perfil</button>
              </div>
            )}
          </div>
          <div className="text-right">
            <Button type="button" variant="outline" onClick={useMyLocation} disabled={locating} className="gap-2">{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} {locating ? "Localizando..." : "Usar minha localização"}</Button>
            {locationMessage && <p className="mt-1 max-w-xs text-xs text-muted-foreground" role="status">{locationMessage}</p>}
          </div>
        </div>
      </div>

      <div className="grid min-h-[620px] overflow-hidden rounded-[1.4rem] border bg-card shadow-sm lg:min-h-0 lg:flex-1 lg:grid-cols-[360px_1fr]">
        <aside className="flex min-h-0 flex-col overflow-hidden border-b lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b p-4">
            <div className="flex gap-2">
              <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar benefício" className="pl-9" /></div>
              <Button type="button" variant={activeFilterCount > 0 ? "secondary" : "outline"} onClick={() => setFiltersOpen((open) => !open)} aria-expanded={filtersOpen} className="shrink-0 gap-2 px-3">
                <SlidersHorizontal className="h-4 w-4" />
                <span>Filtros{activeFilterCount > 0 && ` (${activeFilterCount})`}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", filtersOpen && "rotate-180")} />
              </Button>
            </div>
            {filtersOpen && (
              <div className="space-y-3 rounded-xl border bg-muted/25 p-3">
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Região</legend>
                  <div className="flex flex-wrap gap-2">
                    {["all", ...regions].map((item) => <button key={item} type="button" onClick={() => setRegion(item)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", region === item ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/60 hover:text-primary")}>{item === "all" ? "Todas" : item}</button>)}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</legend>
                  <div className="flex flex-wrap gap-2">
                    {["all", ...categories].map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors", category === item ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/60 hover:text-primary")}>{item === "all" ? "Todas" : item}</button>)}
                  </div>
                </fieldset>
                {activeFilterCount > 0 && <button type="button" onClick={() => { setRegion("all"); setCategory("all"); }} className="text-xs font-medium text-muted-foreground hover:text-foreground">Limpar filtros</button>}
              </div>
            )}
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {profile.filterEnabled && criteriaQuery.loading && <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analisando compatibilidade...</div>}
            {profile.filterEnabled && criteriaQuery.error && <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">{criteriaQuery.error} A lista permanece na ordem normal.</div>}
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{filtered.length} {filtered.length === 1 ? "benefício encontrado" : "benefícios encontrados"}</p>
            {filtered.map((benefit) => {
              const compatibility = compatibilityByBenefit.get(benefit.id);
              const coverages = getBenefitCoverages(benefit);
              const currentCoverage = coverages.find((coverage) => coverage.label === region) ?? coverages.find((coverage) => coverage.level === "national") ?? coverages[0];
              const coverageText = coverages.length === 1 ? coverages[0].label : coverages.map((coverage) => coverage.label).join(" e ");
              return <article key={benefit.id} className={cn("rounded-xl border transition", selectedId === benefit.id ? "border-primary bg-primary/5 shadow-sm" : "hover:bg-muted/50")}>
                <button type="button" onClick={() => setSelectedId(benefit.id)} className="w-full p-4 pb-2 text-left">
                  <div className="flex items-start justify-between gap-2"><h2 className="font-semibold">{benefit.title}</h2><MapPin className={cn("h-4 w-4 shrink-0", selectedId === benefit.id ? "text-primary" : "text-muted-foreground")} /></div>
                  <div className="mt-2 flex flex-wrap gap-2"><Badge variant="secondary">{benefit.category}</Badge><Badge variant="outline">{coverages.length > 1 ? `${coverages.length} regiões` : coverageLevelLabel(currentCoverage)}</Badge>{compatibility && <CompatibilityBadge result={compatibility} />}</div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{benefit.description}</p>
                </button>
                {compatibility && <div className="mx-4 mb-2"><CompatibilityExplanation result={compatibility} onCompleteProfile={() => setProfileDialogOpen(true)} /></div>}
                <div className="mx-4 mb-3 flex min-h-7 items-center justify-between gap-3">
                  <p className="text-xs font-medium text-primary">Disponível em {coverageText}</p>
                  {benefit.detailPath && (
                    <Link href={benefit.detailPath} aria-label={`Ver ${benefit.title} no Premium`} title="Ver no Premium" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Eye className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </article>;
            })}
            {filtered.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Nenhum benefício corresponde aos filtros selecionados.</div>}
          </div>
        </aside>

        <section className="relative isolate z-0 min-h-[540px] bg-muted">
          <MapContainer center={selected.center} zoom={11} scrollWheelZoom className="h-full min-h-[620px] w-full lg:min-h-0">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FocusCoverages coverages={displayedCoverages} />
            <FocusUserLocation position={userPosition} />
            {selectedBoundaries.map((boundary) => (
              <GeoJSON
                key={`${selected.id}-${boundary.path}`}
                data={boundary.data}
                style={() => {
                  const index = displayedCoverages.findIndex((coverage) => coverage.boundaryPath === boundary.path);
                  const color = coverageColor(Math.max(index, 0));
                  return { color, fillColor: color, fillOpacity: 0.16, weight: 3 };
                }}
              >
                <Popup><strong>{selected.title}</strong><br />Disponível em {displayedCoverages.find((coverage) => coverage.boundaryPath === boundary.path)?.label}</Popup>
              </GeoJSON>
            ))}
          </MapContainer>

          {displayedCoverages.length > 1 && (
            <div className="pointer-events-none absolute right-3 top-3 z-[500] max-w-56 rounded-xl border bg-background/95 px-3 py-2 shadow-md backdrop-blur-sm">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Áreas selecionadas</p>
              <ul className="space-y-1.5">
                {displayedCoverages.map((coverage, index) => (
                  <li key={`${coverage.label}-${coverage.boundaryPath}`} className="flex items-center gap-2 text-xs font-medium">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: coverageColor(index) }} />
                    <span className="truncate">{coverage.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </section>
      </div>
      <EligibilityProfileDialog
        open={profileDialogOpen}
        initialValues={profile.activeProfileForm}
        saving={profile.saving}
        error={profile.error}
        onCancel={() => setProfileDialogOpen(false)}
        onSave={saveProfile}
      />
    </main>
  );
}
