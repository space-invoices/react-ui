import { beforeEach, describe, expect, mock, test } from "bun:test";
import { act, renderHook } from "@testing-library/react";

import { useTableState } from "@/ui/components/table/hooks/use-table-state";

describe("useTableState", () => {
  describe("handlePageChange", () => {
    test("should set next_cursor when navigating forward", () => {
      const { result } = renderHook(() =>
        useTableState({
          defaultOrderBy: "-id",
        }),
      );

      act(() => {
        result.current.handlePageChange({ next: "cursor_123" });
      });

      expect(result.current.params.next_cursor).toBe("cursor_123");
      expect(result.current.params.prev_cursor).toBeUndefined();
    });

    test("should set prev_cursor when navigating backward", () => {
      const { result } = renderHook(() =>
        useTableState({
          defaultOrderBy: "-id",
        }),
      );

      act(() => {
        result.current.handlePageChange({ prev: "cursor_456" });
      });

      expect(result.current.params.prev_cursor).toBe("cursor_456");
      expect(result.current.params.next_cursor).toBeUndefined();
    });

    test("should correctly navigate forward then backward", () => {
      const { result } = renderHook(() =>
        useTableState({
          defaultOrderBy: "-id",
        }),
      );

      // Navigate forward to page 2
      act(() => {
        result.current.handlePageChange({ next: "page1_last_id" });
      });

      expect(result.current.params.next_cursor).toBe("page1_last_id");
      expect(result.current.params.prev_cursor).toBeUndefined();

      // Now navigate backward to page 1
      act(() => {
        result.current.handlePageChange({ prev: "page2_first_id" });
      });

      expect(result.current.params.prev_cursor).toBe("page2_first_id");
      expect(result.current.params.next_cursor).toBeUndefined();
    });

    test("should work correctly with initialParams containing cursor", () => {
      const { result } = renderHook(() =>
        useTableState({
          initialParams: {
            next_cursor: "existing_cursor",
            order_by: "-id",
          },
          defaultOrderBy: "-id",
        }),
      );

      // Initial state should have the cursor
      expect(result.current.params.next_cursor).toBe("existing_cursor");

      // Navigate backward
      act(() => {
        result.current.handlePageChange({ prev: "new_prev_cursor" });
      });

      expect(result.current.params.prev_cursor).toBe("new_prev_cursor");
      expect(result.current.params.next_cursor).toBeUndefined();
    });

    test("should call onChangeParams when params change", () => {
      const onChangeParams = mock<(params: any) => void>();

      const { result } = renderHook(() =>
        useTableState({
          defaultOrderBy: "-id",
          onChangeParams,
        }),
      );

      act(() => {
        result.current.handlePageChange({ next: "cursor_123" });
      });

      expect(onChangeParams).toHaveBeenCalledWith(
        expect.objectContaining({
          next_cursor: "cursor_123",
        }),
      );
    });

    test("should sync state when initialParams changes (simulating URL update)", () => {
      const { result, rerender } = renderHook(
        ({ initialParams }) =>
          useTableState({
            initialParams,
            defaultOrderBy: "-id",
          }),
        {
          initialProps: { initialParams: {} },
        },
      );

      // Initial state - no cursors
      expect(result.current.params.next_cursor).toBeUndefined();
      expect(result.current.params.prev_cursor).toBeUndefined();

      // Simulate URL update with prev_cursor (like after clicking Previous button)
      rerender({ initialParams: { prev_cursor: "from_url_cursor" } });

      // State should sync with new initialParams
      expect(result.current.params.prev_cursor).toBe("from_url_cursor");
    });
  });

  describe("handleSort", () => {
    test("should clear cursors when sorting", () => {
      const { result } = renderHook(() =>
        useTableState({
          initialParams: {
            next_cursor: "some_cursor",
          },
          defaultOrderBy: "-id",
        }),
      );

      expect(result.current.params.next_cursor).toBe("some_cursor");

      act(() => {
        result.current.handleSort("name");
      });

      expect(result.current.params.order_by).toBe("name");
      expect(result.current.params.next_cursor).toBeUndefined();
      expect(result.current.params.prev_cursor).toBeUndefined();
    });
  });

  describe("handleSearch", () => {
    test("should clear cursors when searching", () => {
      const { result } = renderHook(() =>
        useTableState({
          initialParams: {
            prev_cursor: "some_cursor",
          },
          defaultOrderBy: "-id",
        }),
      );

      expect(result.current.params.prev_cursor).toBe("some_cursor");

      act(() => {
        result.current.handleSearch("search term");
      });

      expect(result.current.params.search).toBe("search term");
      expect(result.current.params.next_cursor).toBeUndefined();
      expect(result.current.params.prev_cursor).toBeUndefined();
    });
  });
});
