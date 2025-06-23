'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RedirectPage({targetPage, redirectDelay}: {targetPage: string, redirectDelay?: number}) {
    // Default redirect time is 2000ms (2 seconds) if not provided
    const delay = redirectDelay ?? 2000;
    const router = useRouter();

    useEffect(() => {
        const timeout = setTimeout(() => {
        router.push(targetPage)
        }, delay)

        return () => clearTimeout(timeout)
    }, [router])

    return (
        <div className="flex flex-col items-center justify-center h-screen space-y-4">
        <h1 className="text-3xl font-bold">Redirecting...</h1>
        <p className="text-lg text-center text-gray-600">
            You will be redirected shortly.
        </p>
        </div>
    )
}