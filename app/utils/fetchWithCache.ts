"use server"

const ONE_DAY_IN_SECONDS = 86400

interface FetchOptions extends RequestInit {
  revalidate?: number
}

export async function fetchWithCache(
  url: string | URL | Request,
  options?: FetchOptions
): Promise<Response> {
  const { revalidate, ...restOptions } = options || {}

  const fetchOptions: RequestInit = {
    cache: "force-cache",
    ...restOptions,
    next: {
      revalidate: revalidate ?? ONE_DAY_IN_SECONDS,
    },
  }

  return fetch(url, fetchOptions)
}
