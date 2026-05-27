import { useState } from 'react';
import { Cookie, Settings, X } from 'lucide-react';
import { Button } from './button';
import { Switch } from './switch';
import { Card } from './card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { useCookieConsent, CookiePreferences } from '@/hooks/useCookieConsent';

export const CookieBanner = () => {
  const {
    showBanner,
    acceptAll,
    acceptNecessaryOnly,
    updatePreferences,
    consentData
  } = useCookieConsent();
  
  const [showPreferences, setShowPreferences] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<CookiePreferences>(
    consentData.preferences
  );

  if (!showBanner) return null;

  const handlePreferenceChange = (type: keyof CookiePreferences, value: boolean) => {
    if (type === 'necessary') return;
    
    setTempPreferences(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleSavePreferences = () => {
    updatePreferences(tempPreferences);
    setShowPreferences(false);
  };

  const cookieTypes = [
    {
      id: 'necessary' as const,
      title: 'Cookies Necessários',
      description: 'Essenciais para o funcionamento do site. Não podem ser desabilitados.',
      required: true
    },
    {
      id: 'analytics' as const,
      title: 'Cookies de Análise',
      description: 'Nos ajudam a entender como você usa nosso site para melhorá-lo.',
      required: false
    },
    {
      id: 'marketing' as const,
      title: 'Cookies de Marketing',
      description: 'Usados para personalizar anúncios e conteúdo relevante.',
      required: false
    },
    {
      id: 'functional' as const,
      title: 'Cookies Funcionais',
      description: 'Permitem funcionalidades aprimoradas e personalização.',
      required: false
    }
  ];

  return (
    <>
      {/*
        CLS fix: Use CSS containment so the banner never shifts page content.
        - `fixed` positioning already prevents layout shift in most cases.
        - `contain: layout` ensures no paint/layout leak.
        - `will-change: transform` hints compositor layer (avoids reflow on appear).
      */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-fade-in"
        style={{ contain: 'layout', willChange: 'transform' }}
      >
        <Card className="mx-auto max-w-4xl bg-card border-border shadow-lg backdrop-blur-sm">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Cookie className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">
                    Este site usa cookies
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Utilizamos cookies para melhorar sua experiência, personalizar conteúdo e analisar o tráfego. 
                    Você pode escolher quais tipos de cookies aceitar.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={acceptAll}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Aceitar Todos
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={acceptNecessaryOnly}
                  >
                    Apenas Necessários
                  </Button>
                  
                  <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Personalizar
                      </Button>
                    </DialogTrigger>
                    
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Cookie className="h-5 w-5 text-primary" />
                          Preferências de Cookies
                        </DialogTitle>
                        <DialogDescription>
                          Configure suas preferências de cookies. Você pode alterar essas configurações a qualquer momento.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-6">
                        {cookieTypes.map((cookieType) => (
                          <div key={cookieType.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-sm font-medium text-foreground">
                                  {cookieType.title}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {cookieType.description}
                                </p>
                              </div>
                              <Switch
                                checked={tempPreferences[cookieType.id]}
                                onCheckedChange={(checked) => 
                                  handlePreferenceChange(cookieType.id, checked)
                                }
                                disabled={cookieType.required}
                              />
                            </div>
                            {cookieType.required && (
                              <p className="text-xs text-muted-foreground italic">
                                * Obrigatório para o funcionamento do site
                              </p>
                            )}
                          </div>
                        ))}
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            onClick={() => setShowPreferences(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleSavePreferences}
                            className="bg-primary hover:bg-primary/90"
                          >
                            Salvar Preferências
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={acceptNecessaryOnly}
                aria-label="Fechar aviso e continuar apenas com cookies necessários"
                title="Fechar aviso e continuar apenas com cookies necessários"
                className="flex-shrink-0 rounded-full border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
