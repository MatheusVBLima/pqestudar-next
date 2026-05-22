import { BonusToolCard } from "@/components/ui/bonus-tool-card";
import type { BonusPage } from "@/lib/data/bonus";

interface BonusPageContentProps {
  page: BonusPage;
}

export function BonusPageContent({ page }: BonusPageContentProps) {
  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent py-[10px]">
              {page.title}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              {page.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {page.cards.map((tool, index) => (
              <BonusToolCard
                key={index}
                id={`bonus-${page.slug}-${index}`}
                logoUrl={tool.logoUrl}
                logoAlt={tool.logoAlt}
                title={tool.toolTitle}
                description={tool.toolDescription}
                tags={tool.tags || []}
                url={tool.toolLink}
              />
            ))}
        </div>
      </div>
      </main>
    </div>
  );
}
