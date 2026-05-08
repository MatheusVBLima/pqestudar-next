import { Skeleton } from "@/components/ui/skeleton";

export default function ProdutosLoading() {
  return (
    <>
      <div className="container mx-auto px-6 pt-12 md:pt-16 pb-8">
        <Skeleton className="h-8 w-64 mb-3" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>

      <main className="container mx-auto px-6 pt-8 md:pt-12 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-80 rounded-[1.2rem]" />
          ))}
        </div>
      </main>
    </>
  );
}
