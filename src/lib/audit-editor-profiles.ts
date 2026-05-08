/**
 * Editor profiles define which text/SEO fields are editable per entity type.
 * Each profile lists fields with labels, max lengths, and whether they're required.
 */

export interface EditorField {
  key: string;
  label: string;
  type: 'text' | 'textarea';
  maxLength?: number;
  warnLength?: number;
  required?: boolean;
  placeholder?: string;
}

export interface EditorProfile {
  label: string;
  fields: EditorField[];
}

export const editorProfiles: Record<string, EditorProfile> = {
  page_settings: {
    label: 'Configurações de Página',
    fields: [
      {
        key: 'title_tag',
        label: 'Title Tag (SEO)',
        type: 'text',
        maxLength: 120,
        warnLength: 60,
        required: true,
        placeholder: 'Título da página para mecanismos de busca',
      },
      {
        key: 'meta_description',
        label: 'Meta Description',
        type: 'textarea',
        maxLength: 300,
        warnLength: 160,
        required: true,
        placeholder: 'Descrição da página para mecanismos de busca',
      },
      {
        key: 'header_title',
        label: 'Título do Hero (H1)',
        type: 'text',
        maxLength: 120,
        warnLength: 90,
        required: true,
        placeholder: 'Título principal exibido no topo da página',
      },
      {
        key: 'header_description',
        label: 'Descrição do Hero',
        type: 'textarea',
        maxLength: 500,
        warnLength: 300,
        required: false,
        placeholder: 'Descrição exibida abaixo do título',
      },
    ],
  },
  oportunidade: {
    label: 'Oportunidade / Concurso',
    fields: [
      {
        key: 'titulo',
        label: 'Título',
        type: 'text',
        maxLength: 200,
        warnLength: 120,
        required: true,
        placeholder: 'Título da oportunidade',
      },
      {
        key: 'meta_title',
        label: 'Meta Title (SEO)',
        type: 'text',
        maxLength: 120,
        warnLength: 60,
        required: false,
        placeholder: 'Título para mecanismos de busca (deixe vazio para usar o título)',
      },
      {
        key: 'meta_description',
        label: 'Meta Description',
        type: 'textarea',
        maxLength: 300,
        warnLength: 160,
        required: false,
        placeholder: 'Descrição para mecanismos de busca',
      },
      {
        key: 'resumo_editorial',
        label: 'Resumo Editorial',
        type: 'textarea',
        maxLength: 1000,
        warnLength: 500,
        required: false,
        placeholder: 'Resumo editorial exibido na listagem e no topo da página',
      },
    ],
  },
};

export function getProfile(profileKey: string): EditorProfile | null {
  return editorProfiles[profileKey] ?? null;
}
