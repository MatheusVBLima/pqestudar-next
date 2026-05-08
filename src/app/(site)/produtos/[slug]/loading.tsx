import { Skeleton } from "@/components/ui/skeleton";

export default function ProdutoDetalheLoading() {
  return (
    <main className="container mx-auto px-6 pt-8 md:pt-12 pb-16">
      <Skeleton className="h-5 w-40 mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        <Skeleton className="rounded-[1.2rem] aspect-[4/3] w-full" />

        <div className="flex flex-col gap-5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    </main>
  );
}
