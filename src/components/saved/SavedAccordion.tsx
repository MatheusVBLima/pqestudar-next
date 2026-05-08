import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Wrench, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pqestudar-saved-accordion-state";

interface AccordionSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
  isEmpty: boolean;
}

interface SavedAccordionProps {
  toolsCount: number;
  contestsCount: number;
  toolsContent: React.ReactNode;
  contestsContent: React.ReactNode;
  toolsLoading: boolean;
  contestsLoading: boolean;
  onToolsExpand: () => void;
  onContestsExpand: () => void;
}

export function SavedAccordion({
  toolsCount,
  contestsCount,
  toolsContent,
  contestsContent,
  toolsLoading,
  contestsLoading,
  onToolsExpand,
  onContestsExpand,
}: SavedAccordionProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [hasInitialized, setHasInitialized] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const contestsRef = useRef<HTMLDivElement>(null);

  // Load persisted state and handle hash on mount
  useEffect(() => {
    if (hasInitialized) return;

    const hash = window.location.hash.replace("#", "");
    const stored = localStorage.getItem(STORAGE_KEY);
    let initialState: Set<string>;

    // Priority: hash > stored > first non-empty
    if (hash === "ferramentas" || hash === "concursos") {
      initialState = new Set([hash]);
      // Scroll to section after render
      setTimeout(() => {
        const ref = hash === "ferramentas" ? toolsRef : contestsRef;
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } else if (stored) {
      try {
        const parsed = JSON.parse(stored);
        initialState = new Set(Array.isArray(parsed) ? parsed : []);
      } catch {
        initialState = new Set();
      }
    } else {
      // Auto-open first non-empty section
      if (toolsCount > 0) {
        initialState = new Set(["ferramentas"]);
      } else if (contestsCount > 0) {
        initialState = new Set(["concursos"]);
      } else {
        initialState = new Set();
      }
    }

    setExpandedSections(initialState);
    setHasInitialized(true);

    // Trigger lazy load for initially expanded sections
    if (initialState.has("ferramentas")) {
      onToolsExpand();
    }
    if (initialState.has("concursos")) {
      onContestsExpand();
    }
  }, [toolsCount, contestsCount, hasInitialized, onToolsExpand, onContestsExpand]);

  // Persist state changes
  useEffect(() => {
    if (hasInitialized) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(expandedSections)));
    }
  }, [expandedSections, hasInitialized]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
        // Trigger lazy load
        if (sectionId === "ferramentas") {
          onToolsExpand();
        } else if (sectionId === "concursos") {
          onContestsExpand();
        }
      }
      return newSet;
    });

    // Update URL hash (optional)
    const newExpanded = expandedSections.has(sectionId) ? "" : sectionId;
    if (newExpanded) {
      window.history.replaceState(null, "", `#${newExpanded}`);
    } else {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [expandedSections, onToolsExpand, onContestsExpand]);

  const handleKeyDown = (e: React.KeyboardEvent, sectionId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSection(sectionId);
    }
  };

  const sections: AccordionSection[] = [
    {
      id: "ferramentas",
      title: "Ferramentas salvas",
      icon: <Wrench className="h-5 w-5" />,
      count: toolsCount,
      children: toolsContent,
      isEmpty: toolsCount === 0 && !toolsLoading,
    },
    {
      id: "concursos",
      title: "Concursos salvos",
      icon: <FileText className="h-5 w-5" />,
      count: contestsCount,
      children: contestsContent,
      isEmpty: contestsCount === 0 && !contestsLoading,
    },
  ];

  // Check for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== "undefined" && 
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const isExpanded = expandedSections.has(section.id);
        const panelId = `panel-${section.id}`;
        const headerId = `header-${section.id}`;
        const ref = section.id === "ferramentas" ? toolsRef : contestsRef;

        return (
          <div
            key={section.id}
            ref={ref}
            className="rounded-lg border bg-card overflow-hidden"
          >
            {/* Accordion Header */}
            <button
              id={headerId}
              role="button"
              aria-controls={panelId}
              aria-expanded={isExpanded}
              onClick={() => toggleSection(section.id)}
              onKeyDown={(e) => handleKeyDown(e, section.id)}
              className={cn(
                "w-full flex items-center justify-between p-4 text-left",
                "hover:bg-muted/50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-primary">{section.icon}</span>
                <span className="font-semibold text-foreground">
                  {section.title}
                </span>
                {section.count > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {section.count}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>

            {/* Accordion Panel */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={headerId}
                  initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-0 border-t">
                    {section.children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
