// Service for generating AI-powered news content about education
export interface NewsArticle {
  id: number;
  titulo: string;
  descricao: string;
  categoria: string;
  data: string;
  tempo: string;
  urgente: boolean;
  imagem: string;
  conteudoCompleto?: string;
  autor?: string;
  visualizacoes?: number;
  tags?: string[];
  fontes?: Array<{ nome: string; url: string }>;
}

export class AINewsService {
  private static newsTopics = [
    "ENEM",
    "Concursos",
    "SISU", 
    "ProUni",
    "FIES",
    "Vestibular",
    "Educação"
  ];

  private static newsTemplates: Record<string, string[]> = {
    "ENEM": [
      "ENEM 2025: Inep anuncia mudanças importantes no cronograma de inscrições",
      "ENEM 2025: novo sistema de correção promete mais transparência aos candidatos", 
      "Cronograma completo do ENEM 2025 é divulgado com datas atualizadas pelo MEC",
      "ENEM 2025: inscrições começam em maio com novas regras de documentação",
      "Resultado do ENEM 2024 já disponível na Página do Participante desde janeiro"
    ],
    "Concursos": [
      "Concurso PRF 2025: abertas 1.500 vagas com salário inicial de R$ 9.899",
      "Edital Receita Federal oferece 3.000 vagas com salários até R$ 21 mil",
      "Concurso INSS 2025: processo seletivo para 5.000 vagas será em abril",
      "Banco do Brasil abre concurso com 4.480 vagas e salário de R$ 4.693",
      "TRT São Paulo: concurso oferece 100 vagas para diversos cargos públicos"
    ],
    "SISU": [
      "SISU 2025: MEC confirma calendário com inscrições em fevereiro para 250 mil vagas",
      "Universidades federais ampliam 15% das vagas no SISU 2025 em todo o país",
      "SISU 2025: lista de espera terá novo formato de convocação mais ágil",
      "Notas de corte parciais do SISU 2025 mostram alta concorrência em medicina",
      "SISU 2025: sistema permite até 3 alterações de curso durante inscrições"
    ],
    "ProUni": [
      "ProUni 2025: mais de 490 mil bolsas de estudo já estão disponíveis no país",
      "Cronograma do ProUni 2025 confirmado pelo MEC com inscrições em março",
      "ProUni amplia critérios de renda familiar para bolsas parciais em 2025",
      "Lista de espera do ProUni 2025 será liberada em abril com novas regras",
      "ProUni 2025: cursos de tecnologia ganham 20% mais bolsas este ano"
    ],
    "FIES": [
      "FIES 2025: novas condições de financiamento beneficiam estudantes de baixa renda",
      "Cronograma do FIES 2025 prevê inscrições para abril com juros reduzidos",
      "FIES amplia financiamento para cursos de medicina e engenharia em 2025",
      "Renovação do FIES 2025: prazo estendido até março para regularização",
      "FIES 2025: Caixa Econômica facilita processo de contratação digital"
    ],
    "Vestibular": [
      "Vestibular USP 2025: Fuvest divulga cronograma com provas em dezembro",
      "UNICAMP 2025: inscrições abertas para 2.540 vagas em cursos de graduação",
      "Vestibular UFRJ oferece 10.557 vagas com provas aplicadas em outubro",
      "UnB divulga PAS 2025 com nova modalidade de acesso ao ensino superior",
      "Vestibular UFMG 2025: processo seletivo para 6.298 vagas inicia em junho"
    ],
    "Educação": [
      "MEC anuncia R$ 15 bilhões em investimentos para educação básica em 2025",
      "Novo Ensino Médio: implementação completa será concluída até dezembro",
      "PNAE 2025: programa de alimentação escolar ganha novos itens nutritivos",
      "Base Nacional Comum Curricular: novas diretrizes entram em vigor em 2025",
      "Programa Mais Alfabetização amplia atendimento para 2 milhões de alunos"
    ]
  };

  private static descriptions = [
    "O Ministério da Educação divulgou mudanças importantes nos processos seletivos de 2025 que impactam milhões de estudantes brasileiros. Veja prazos e como se inscrever.",
    "Cronograma atualizado traz novas datas e procedimentos para garantir maior transparência no processo seletivo. Confira documentos necessários e orientações oficiais.",
    "Estudantes têm prazo limitado para inscrições. Documentação deve estar completa e atualizada conforme edital. Não perca as datas importantes do calendário oficial.",
    "Novas diretrizes visam ampliar o acesso ao ensino superior e democratizar oportunidades educacionais. Sistema digital facilita acompanhamento em tempo real dos processos.",
    "Programa governamental oferece milhares de vagas em universidades públicas e privadas de todo o país. Critérios de seleção foram atualizados para beneficiar mais estudantes.",
    "Alterações no edital beneficiam estudantes de escola pública e baixa renda com critérios mais inclusivos. Plataforma oficial disponibiliza todas as informações atualizadas.",
    "Sistema automatizado permite inscrições e acompanhamento dos processos seletivos em tempo real. Candidatos podem consultar status e resultados na plataforma digital oficial.",
    "Resultados preliminares já estão disponíveis para consulta no portal oficial do programa. Lista de espera será divulgada conforme cronograma estabelecido pelo órgão responsável."
  ];

  private static organizations = [
    "PRF", "PF", "Receita Federal", "INSS", "Banco do Brasil", 
    "Caixa Econômica", "TRT", "TRF", "MPU", "IBGE"
  ];

  private static universities = [
    "USP", "UNICAMP", "UFRJ", "UFMG", "UnB", "UFSC", "UFRGS", "UFC"
  ];

  static generateNews(count: number = 5): NewsArticle[] {
    const news: NewsArticle[] = [];
    for (let i = 0; i < count; i++) {
      const categoria = this.getRandomItem(this.newsTopics);
      const titulo = this.getRandomItem(this.newsTemplates[categoria]);
      const description = this.getRandomItem(this.descriptions);
      
      const data = this.getRandomDate();
      const tempo = this.getTimeAgo(data);
      const conteudoCompleto = this.generateFullContent(categoria, titulo);
      
      news.push({
        id: Date.now() + i,
        titulo,
        descricao: description,
        categoria,
        data: data.toISOString().split('T')[0],
        tempo,
        urgente: Math.random() < 0.3, // 30% chance of being urgent
        imagem: "/placeholder.svg",
        conteudoCompleto,
        autor: this.getRandomAuthor(categoria),
        visualizacoes: Math.floor(Math.random() * 50000) + 1000,
        tags: this.generateTags(categoria),
        fontes: this.generateSources(categoria)
      });
    }
    
    return news.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }

  private static generateFullContent(categoria: string, _titulo: string): string {
    const currentYear = new Date().getFullYear();
    const contentTemplates: Record<string, string[]> = {
      "ENEM": [
        `<div class="bg-muted/30 p-4 rounded-lg mb-6 italic border-l-4 border-blue-500">
           <p class="text-base font-medium text-foreground">O Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (Inep) confirmou as principais mudanças no ENEM ${currentYear}, incluindo novo formato das questões e cronograma atualizado para beneficiar estudantes de todo o país.</p>
         </div>
         
         <h3 class="text-lg font-semibold mb-3 text-foreground">📋 Parágrafo de Abertura</h3>
         <p class="mb-6 text-foreground leading-relaxed">O Exame Nacional do Ensino Médio (ENEM) ${currentYear} traz importantes atualizações no processo de inscrição e aplicação das provas. As mudanças foram implementadas para garantir maior transparência e acessibilidade aos candidatos de todo o Brasil.</p>
         
         <h3 class="text-lg font-semibold mb-3 text-foreground">🔍 Contexto e Detalhes</h3>
         <p class="mb-6 text-foreground leading-relaxed">Segundo dados oficiais do Inep, mais de 4 milhões de estudantes se inscreveram no ENEM em ${currentYear - 1}, demonstrando a importância do exame como porta de entrada para o ensino superior. As universidades públicas utilizam as notas para seleção através do SISU, enquanto instituições privadas oferecem bolsas pelo ProUni e financiamento via FIES. O exame também serve como certificação para quem não concluiu o ensino médio na idade regular.</p>
         
         <div class="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
           <h3 class="text-lg font-semibold mb-4 flex items-center text-foreground">📅 Datas e Informações Principais</h3>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
             <div class="flex items-start gap-2">📝 <strong>Inscrições:</strong> 27 de maio a 7 de junho</div>
             <div class="flex items-start gap-2">💰 <strong>Pagamento:</strong> até 12 de junho</div>
             <div class="flex items-start gap-2">📚 <strong>Provas:</strong> 9 e 16 de novembro</div>
             <div class="flex items-start gap-2">📊 <strong>Resultado:</strong> 13 de janeiro de ${currentYear + 1}</div>
           </div>
         </div>
         
         <h3 class="text-lg font-semibold mb-3 text-foreground">💡 Orientações Práticas</h3>
         <ul class="list-disc ml-6 mb-6 space-y-2 text-foreground">
           <li>Mantenha seus documentos pessoais atualizados antes da inscrição</li>
           <li>Solicite isenção da taxa se você atender aos critérios de baixa renda</li>
           <li>Escolha a cidade de prova mais próxima de sua residência</li>
           <li>Prepare-se com antecedência usando os materiais oficiais do Inep</li>
         </ul>
         
         <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
           <h3 class="text-lg font-semibold mb-3 text-foreground">✅ Dicas Importantes</h3>
           <p class="text-sm text-foreground">Fique atento aos prazos oficiais e mantenha seus dados sempre atualizados na Página do Participante. O ENEM é gratuito para estudantes de escola pública e quem comprova baixa renda.</p>
         </div>
         
         <div class="bg-accent p-4 rounded-lg mb-6 text-center">
           <button class="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
             📱 Acessar Portal do ENEM
           </button>
         </div>`,
         
        `<div class="bg-muted/30 p-4 rounded-lg mb-6 italic border-l-4 border-blue-500">
           <p class="text-base font-medium text-foreground">Novo sistema de correção da redação do ENEM ${currentYear} promete maior transparência e agilidade na divulgação dos resultados para milhões de candidatos brasileiros.</p>
         </div>
         
         <p class="mb-6 text-foreground leading-relaxed">O Instituto Nacional de Estudos e Pesquisas Educacionais Anísio Teixeira (Inep) implementou melhorias significativas no processo de correção da redação do ENEM ${currentYear}. As mudanças visam aumentar a transparência e garantir maior agilidade na divulgação dos resultados.</p>
         
         <div class="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
           <h3 class="text-lg font-semibold mb-4 flex items-center text-foreground">📅 Cronograma da Redação</h3>
           <div class="space-y-2 text-sm">
             <div class="flex items-start gap-2">✍️ <strong>Aplicação:</strong> 9 de novembro (domingo)</div>
             <div class="flex items-start gap-2">🔍 <strong>Correção:</strong> novembro a dezembro de ${currentYear}</div>
             <div class="flex items-start gap-2">📋 <strong>Divulgação:</strong> junto com as demais notas</div>
             <div class="flex items-start gap-2">📝 <strong>Recursos:</strong> 20 a 24 de janeiro de ${currentYear + 1}</div>
           </div>
         </div>`
      ],
      "SISU": [
        `<div class="bg-muted/30 p-4 rounded-lg mb-6 italic border-l-4 border-purple-500">
           <p class="text-base font-medium text-foreground">O Ministério da Educação divulgou o calendário completo do SISU ${currentYear} com mudanças importantes nas inscrições e chamadas para universidades federais de todo o país.</p>
         </div>
         
         <p class="mb-6 text-foreground leading-relaxed">O Sistema de Seleção Unificada (SISU) ${currentYear} oferece mais de 250 mil vagas em universidades federais brasileiras. O programa utiliza as notas do ENEM para seleção de candidatos em cursos de graduação, democratizando o acesso ao ensino superior público.</p>
         
         <div class="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
           <h3 class="text-lg font-semibold mb-4 flex items-center text-foreground">📅 Datas e Informações Principais</h3>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
             <div class="flex items-start gap-2">📝 <strong>Inscrições:</strong> 17 a 21 de fevereiro</div>
             <div class="flex items-start gap-2">📢 <strong>Resultado 1ª chamada:</strong> 26 de fevereiro</div>
             <div class="flex items-start gap-2">📋 <strong>Matrícula:</strong> 27 de fevereiro a 5 de março</div>
             <div class="flex items-start gap-2">🔄 <strong>Lista de espera:</strong> 26 de fevereiro a 5 de março</div>
           </div>
         </div>
         
         <h3 class="text-lg font-semibold mb-3 text-foreground">💡 Orientações Práticas</h3>
         <ul class="list-disc ml-6 mb-6 space-y-2 text-foreground">
           <li>Escolha opções de curso com base na nota de corte parcial atualizada diariamente</li>
           <li>Confira previamente os documentos exigidos pela universidade escolhida</li>
           <li>Lembre-se: alterações nas opções podem ser feitas até o último dia de inscrição</li>
           <li>Monitore as notas de corte diariamente para tomar decisões estratégicas</li>
         </ul>
         
         <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
           <h3 class="text-lg font-semibold mb-3 text-foreground">✅ Dicas Importantes</h3>
           <p class="text-sm text-foreground">Escolha suas opções considerando a nota de corte parcial e lembre-se de que pode alterá-las até o fim do prazo. Mantenha um plano B com a lista de espera.</p>
         </div>
         
         <div class="bg-accent p-4 rounded-lg mb-6 text-center">
           <button class="bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
             🎓 Acessar Portal do SISU
           </button>
         </div>`
      ],
      "ProUni": [
        `<div class="bg-muted/30 p-4 rounded-lg mb-6 italic border-l-4 border-orange-500">
           <p class="text-base font-medium text-foreground">O Programa Universidade para Todos (ProUni) disponibiliza mais de 490 mil bolsas de estudo em instituições privadas de ensino superior em todo o Brasil para o ano de ${currentYear}.</p>
         </div>
         
         <p class="mb-6 text-foreground leading-relaxed">O ProUni ${currentYear} oferece bolsas integrais e parciais para estudantes de baixa renda em cursos de graduação. O programa utiliza as notas do ENEM como critério de seleção e exige comprovação de renda familiar para concessão dos benefícios educacionais.</p>
         
         <div class="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
           <h3 class="text-lg font-semibold mb-4 flex items-center text-foreground">📅 Cronograma ProUni ${currentYear}</h3>
           <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
             <div class="flex items-start gap-2">📝 <strong>Inscrições:</strong> 24 a 27 de março</div>
             <div class="flex items-start gap-2">📢 <strong>1ª chamada:</strong> 4 de abril</div>
             <div class="flex items-start gap-2">📋 <strong>2ª chamada:</strong> 18 de abril</div>
             <div class="flex items-start gap-2">🔄 <strong>Lista de espera:</strong> 25 de abril a 2 de maio</div>
           </div>
         </div>
         
         <h3 class="text-lg font-semibold mb-3 text-foreground">💡 Orientações Práticas</h3>
         <ul class="list-disc ml-6 mb-6 space-y-2 text-foreground">
           <li>Verifique se sua renda familiar atende aos critérios de bolsa integral ou parcial</li>
           <li>Organize antecipadamente a documentação necessária para comprovação</li>
           <li>Pesquise os cursos e instituições disponíveis em sua região</li>
           <li>Fique atento aos prazos de cada fase do processo seletivo</li>
         </ul>`
      ]
    };

    const defaultContent = `<div class="bg-muted/30 p-4 rounded-lg mb-6 italic border-l-4 border-primary">
                           <p class="text-base font-medium text-foreground">Informações importantes sobre educação que impactam estudantes e profissionais de todo o país, com orientações práticas e datas relevantes.</p>
                         </div>
                         <p class="mb-6 text-foreground leading-relaxed">Acompanhe as atualizações e não perca prazos importantes para sua formação acadêmica e desenvolvimento profissional na área educacional.</p>`;

    const templates = contentTemplates[categoria] || [defaultContent];
    return this.getRandomItem(templates);
  }

  private static getRandomAuthor(categoria: string): string {
    const authors: Record<string, string[]> = {
      "ENEM": ["Ministério da Educação", "Inep", "Portal do MEC"],
      "Concursos": ["Portal de Concursos", "Organizadora do Concurso", "Órgão Público"],
      "SISU": ["Sistema SISU", "MEC", "Portal do Estudante"],
      "ProUni": ["Programa ProUni", "MEC", "Portal do ProUni"],
      "FIES": ["Programa FIES", "MEC", "Caixa Econômica Federal"]
    };
    
    const categoryAuthors = authors[categoria] || ["Portal de Educação"];
    return this.getRandomItem(categoryAuthors);
  }

  private static generateTags(categoria: string): string[] {
    const baseTags = [categoria];
    const additionalTags: Record<string, string[]> = {
      "ENEM": ["Ensino Superior", "Vestibular", "Educação"],
      "Concursos": ["Serviço Público", "Carreira", "Vagas"],
      "SISU": ["Universidade", "Ensino Superior", "Seleção"],
      "ProUni": ["Bolsa Estudos", "Ensino Superior", "Educação"],
      "FIES": ["Financiamento", "Ensino Superior", "Educação"],
      "Vestibular": ["Ensino Superior", "Graduação", "Universidade"],
      "Educação": ["MEC", "Políticas Públicas", "Ensino"]
    };
    
    const extra = additionalTags[categoria] || ["Oportunidades", "Educação"];
    return [...baseTags, ...extra.slice(0, 3)]; // Máximo 4 tags
  }

  private static generateSources(categoria: string): Array<{ nome: string; url: string }> {
    const sources: Record<string, Array<{ nome: string; url: string }>> = {
      "ENEM": [
        { nome: "Portal do Inep", url: "https://www.gov.br/inep" },
        { nome: "Ministério da Educação", url: "https://www.gov.br/mec" }
      ],
      "Concursos": [
        { nome: "Portal de Concursos Públicos", url: "#" },
        { nome: "Diário Oficial", url: "#" }
      ],
      "SISU": [
        { nome: "Portal do SISU", url: "https://sisu.mec.gov.br" },
        { nome: "MEC", url: "https://www.gov.br/mec" }
      ]
    };
    
    return sources[categoria] || [{ nome: "Portal de Educação", url: "#" }];
  }

  private static getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private static fillTemplate(template: string, _year: number): string {
    // Templates já são específicos e otimizados, não precisam de replacements
    return template;
  }

  private static getRandomDate(): Date {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30); // Last 30 days
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date;
  }

  private static getRandomFutureDate(): string {
    const now = new Date();
    const daysAhead = Math.floor(Math.random() * 60) + 1; // Next 60 days
    const date = new Date(now);
    date.setDate(date.getDate() + daysAhead);
    return date.toLocaleDateString('pt-BR');
  }

  private static getTimeAgo(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "há 1 dia";
    if (diffDays < 7) return `há ${diffDays} dias`;
    if (diffDays < 14) return "há 1 semana";
    if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`;
    return `há ${Math.floor(diffDays / 30)} meses`;
  }
}
