import type { QueryClient } from "@tanstack/react-query";

export function invalidateRevenueRecognitionQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["revenue-recognition-report"] });
  queryClient.invalidateQueries({ queryKey: ["revenue-recognition-details"] });
}
