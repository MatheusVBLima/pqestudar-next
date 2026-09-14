// Public, deliberately small editorial sample. Coverage is not an eligibility decision.
export type MboBenefit = {
  id: string; title: string; category: string; scope: string; state?: string; city?: string;
  summary: string; image: string; source: string; requirements: string[]; steps: string[];
};

export const MBO_REVIEWED_AT = "12/09/2026";
export const MBO_BENEFITS: MboBenefit[] = [
  {
    id: "id-jovem", title: "ID Jovem", category: "Cultura e transporte", scope: "Brasil",
    summary: "Meia-entrada e acesso a vagas gratuitas ou com desconto em viagens interestaduais, conforme as regras do programa.",
    image: "culture", source: "https://www.gov.br/pt-br/servicos/obter-a-carteira-de-identidade-jovem",
    requirements: ["Ter entre 15 e 29 anos.", "Renda familiar mensal de até dois salários mínimos.", "CadÚnico atualizado nos últimos 24 meses. Não é necessário ser estudante."],
    steps: ["Conferi minha idade, renda familiar e atualização do CadÚnico.", "Separei meus dados de identificação para a emissão.", "Consultei a emissão e as regras de uso no canal oficial."],
  },
  {
    id: "farmacia-popular", title: "Farmácia Popular", category: "Saúde", scope: "Brasil",
    summary: "Acesso gratuito aos medicamentos e insumos contemplados pelo programa em farmácias credenciadas.",
    image: "hero", source: "https://www.gov.br/saude/pt-br/assuntos/noticias/2025/marco/saiba-como-retirar-medicamentos-e-insumos-pelo-farmacia-popular",
    requirements: ["O medicamento ou insumo precisa fazer parte da lista do programa.", "Documento oficial com foto, CPF e receita dentro da validade para medicamentos.", "Alguns insumos têm critérios e documentos adicionais. Confira a regra do item."],
    steps: ["Conferi se o item está na lista e quais regras se aplicam.", "Separei documento, CPF e receita válida ou documentos exigidos.", "Localizei uma farmácia credenciada no canal oficial."],
  },
  {
    id: "escola-trabalhador", title: "Escola do Trabalhador 4.0", category: "Educação e trabalho", scope: "Brasil",
    summary: "Cursos gratuitos de tecnologia e produtividade para desenvolver habilidades digitais, em diferentes níveis.",
    image: "education", source: "https://www.gov.br/trabalho-e-emprego/pt-br/servicos/trabalhador/qualificacao-profissional/caminho-digital",
    requirements: ["Escolher uma formação disponível na plataforma oficial.", "Conferir os requisitos da formação e realizar o cadastro solicitado.", "Ter acesso à internet para acompanhar o curso online."],
    steps: ["Escolhi um curso e conferi seu conteúdo e nível.", "Conferi os dados solicitados para o cadastro oficial.", "Reservei um horário para começar a formação."],
  },
  {
    id: "passe-livre", title: "Passe Livre Todo Dia", category: "Cultura e transporte", scope: "Fortaleza · CE", state: "CE", city: "Fortaleza",
    summary: "Duas passagens gratuitas por dia para estudantes com carteira válida da Etufor, inclusive nas férias e fins de semana.",
    image: "transport", source: "https://www.fortaleza.ce.gov.br/noticias/prefeito-evandro-leitao-sanciona-passe-livre-todo-dia-ampliado-para-ferias-fins-de-semana-e-feriados",
    requirements: ["Ser estudante atendido pelo programa de Fortaleza.", "Ter carteira estudantil válida da Etufor.", "Conferir a situação da carteira e as orientações atuais da prefeitura."],
    steps: ["Conferi as regras do programa para minha instituição de ensino.", "Verifiquei a validade da minha carteira estudantil.", "Consultei as orientações de uso ou solicitação na prefeitura."],
  },
];

export const MBO_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export function filterMboBenefits(state: string, city: string, category: string) {
  return MBO_BENEFITS.filter((benefit) =>
    (!state || !benefit.state || benefit.state === state) &&
    (!city || !benefit.city || benefit.city === city) &&
    (!category || benefit.category === category),
  );
}
