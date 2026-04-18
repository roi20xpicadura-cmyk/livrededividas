export async function queryWithRetry<T>(
  queryFn: () => Promise<{ data: T | null; error: unknown }>,
  maxRetries = 3
): Promise<{ data: T | null; error: unknown }> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await queryFn();
      if (result.error) {
        if (i === maxRetries - 1) return result;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return result;
    } catch (error) {
      if (i === maxRetries - 1) return { data: null, error };
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return { data: null, error: new Error('Max retries reached') };
}
