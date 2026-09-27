import { redirect } from "next/navigation"
import { Results, ResultsSkeleton } from "./_components/results"
import { Suspense } from "react"

interface SearchPageProps {
    searchParams: Promise<{
        term?: string
    }>
}

export default async function SearchPage ({searchParams}: SearchPageProps) {
    const resolvedSearchParams = await searchParams;
    if (!resolvedSearchParams.term) {
        redirect("/")
    }


    return (
        <div className="h-full p-8 max-w-screen-2xl mx-auto">
            <Suspense fallback={<ResultsSkeleton />}>
            <Results term={resolvedSearchParams.term} />
            </Suspense>
        </div>
    )
}