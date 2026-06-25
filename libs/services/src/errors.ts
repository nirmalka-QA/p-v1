import type { AxiosError } from 'axios'

/** One normalized error shape for the whole app — no raw axios errors leak out. */
export interface NormalizedError {
  status: number | undefined
  data: unknown
  message: string
}

/** Collapse any thrown value (axios error, Error, or unknown) into NormalizedError. */
export function normalizeError(error: unknown): NormalizedError {
  const ax = error as AxiosError
  if (ax && ax.isAxiosError) {
    return { status: ax.response?.status, data: ax.response?.data, message: ax.message }
  }
  if (error instanceof Error) {
    return { status: undefined, data: undefined, message: error.message }
  }
  return { status: undefined, data: undefined, message: String(error) }
}
