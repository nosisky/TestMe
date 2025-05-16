import toast from 'react-hot-toast';

/**
 * Handle API responses and show toasts for errors
 * @param response The API response
 * @param successMessage Optional success message to show
 * @returns The parsed response data if successful
 * @throws Error with message if the response is not ok
 */
export async function handleApiResponse<T>(
  response: Response, 
  successMessage?: string
): Promise<T> {
  let data;
  try {
    data = await response.json();
  } catch (e) {
    // If response can't be parsed as JSON
    const errorMessage = `Server error: Failed to parse response - ${e instanceof Error ? e.message : String(e)}`;
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (!response.ok) {
    const errorMessage = data?.error || `Error: ${response.status} ${response.statusText}`;
    toast.error(errorMessage);
    throw new Error(errorMessage);
  }

  if (successMessage) {
    toast.success(successMessage);
  }

  return data as T;
}

/**
 * Handle fetch errors and show toasts
 * @param error The error caught in catch block
 * @param fallbackMessage Fallback message to show if error doesn't have a message
 * @throws The original error after showing toast
 */
export function handleFetchError(error: unknown, fallbackMessage = 'An unexpected error occurred'): never {
  const errorMessage = error instanceof Error ? error.message : fallbackMessage;
  toast.error(errorMessage);
  throw error;
} 