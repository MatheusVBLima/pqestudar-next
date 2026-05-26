"use client";

import { useState, useEffect } from 'react';
import { Cookie, Settings, Shield, BarChart, Target, Zap } from 'lucide-react';
import { Button } from './button';
import { Switch } from './switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { useCookieConsent, CookiePreferences } from '@/hooks/useCookieConsent';
import { useToast } from '@/hooks/use-toast';
import { devLog } from '@/lib/dev-log';

interface CookieSettingsProps {
  onClose?: () => void;
}

export const CookieSettings = ({ onClose }: CookieSettingsProps) => {
  const { consentData, updatePreferences, resetConsent } = useCookieConsent();
  const { toast } = useToast();
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>(
    consentData.preferences
  );

  // Sync with external changes (cross-tab or banner updates)
  useEffect(() => {
    setTempPreferences(consentData.preferences);
  }, [consentData.preferences]);

  // Cross-tab synchronization via storage event
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cookieConsent' && e.newValue) {
        devLog('[CookieSettings] Cross-tab sync detected');
        // Hook will auto-update consentData
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'necessary') return; // Cannot disable necessary cookies
    
    setTempPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleSavePreferences = () => {
    devLog('[CookieSettings] Saving preferences:', tempPreferences);
    updatePreferences(tempPreferences);
    
    toast({
      title: "Preferências salvas",
      description: "Suas configurações de cookies foram atualizadas com sucesso.",
    });
    
    onClose?.();
  };

  const handleResetConsent = () => {
    devLog('[CookieSettings] Resetting consent');
    resetConsent();
    
    toast({
      title: "Consentimento redefinido",
      description: "Suas preferências foram resetadas. O banner aparecerá novamente.",
      variant: "destructive",
    });
    
    onClose?.();
  };

  const cookieCategories = [
    {
      id: 'necessary' as const,
      title: 'Cookies Necessários',
      description: 'Cookies essenciais para o funcionamento básico do site',
      icon: Shield,
      color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      details: [
        'Autenticação de usuário',
        'Segurança da sessão',
        'Preferências básicas de navegação',
        'Carrinho de compras'
      ],
      required: true
    },
    {
      id: 'analytics' as const,
      title: 'Cookies de Análise',
      description: 'Coletam informações sobre como você usa nosso site',
      icon: BarChart,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      details: [
        'Google Analytics',
        'Métricas de desempenho',
        'Padrões de navegação',
        'Relatórios de uso'
      ],
      required: false
    },
    {
      id: 'marketing' as const,
      title: 'Cookies de Marketing',
      description: 'Permitem personalizar anúncios e conteúdo',
      icon: Target,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      details: [
        'Publicidade direcionada',
        'Remarketing',
        'Redes sociais',
        'Campanhas personalizadas'
      ],
      required: false
    },
    {
      id: 'functional' as const,
      title: 'Cookies Funcionais',
      description: 'Habilitam funcionalidades aprimoradas e personalização',
      icon: Zap,
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
      details: [
        'Preferências de idioma',
        'Configurações de tema',
        'Favoritos e listas',
        'Chat e suporte'
      ],
      required: false
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Cookie className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações de Cookies</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas preferências de privacidade e cookies
          </p>
        </div>
      </div>

      {consentData.hasConsented && consentData.consentDate && (
        <Card className="border-primary/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Status do Consentimento</p>
                <p className="text-xs text-muted-foreground">
                  Consentimento dado em: {new Date(consentData.consentDate).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                Ativo
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {cookieCategories.map((category) => {
          const IconComponent = category.icon;
          const isEnabled = tempPreferences[category.id];
          
          return (
            <Card key={category.id} className="transition-colors hover:border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.color}`}>
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {category.title}
                        {category.required && (
                          <Badge variant="outline" className="text-xs">
                            Obrigatório
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange(category.id, checked)
                    }
                    disabled={category.required}
                  />
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Este tipo de cookie é usado para:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-muted-foreground">
                    {category.details.map((detail, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 bg-primary rounded-full flex-shrink-0" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
        <Button
          onClick={handleSavePreferences}
          className="bg-primary hover:bg-primary/90 flex-1"
        >
          <Settings className="h-4 w-4 mr-2" />
          Salvar Configurações
        </Button>
        
        <Button
          variant="outline"
          onClick={handleResetConsent}
          className="sm:w-auto"
        >
          Redefinir Consentimento
        </Button>
        
        {onClose && (
          <Button
            variant="ghost"
            onClick={onClose}
            className="sm:w-auto"
          >
            Fechar
          </Button>
        )}
      </div>
    </div>
  );
};
