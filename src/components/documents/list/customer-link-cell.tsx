type CustomerLinkCellProps<T> = {
  item: T;
  customerId?: string | null;
  customerName?: string | null;
  getCustomerHref?: (customerId: string, item: T) => string;
  onCustomerClick?: (customerId: string, item: T) => void;
};

export function CustomerLinkCell<T>({
  item,
  customerId,
  customerName,
  getCustomerHref,
  onCustomerClick,
}: CustomerLinkCellProps<T>) {
  if (!customerName) {
    return "-";
  }

  if (!customerId) {
    return customerName;
  }

  const href = getCustomerHref?.(customerId, item);
  const isClickable = href || onCustomerClick;

  if (!isClickable) {
    return customerName;
  }

  return (
    <a
      href={href ?? "#"}
      className="font-medium text-primary underline-offset-4 hover:underline"
      onClick={(event) => {
        event.stopPropagation();

        const isModifiedClick = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

        if (onCustomerClick && !isModifiedClick) {
          event.preventDefault();
          onCustomerClick(customerId, item);
        }
      }}
    >
      {customerName}
    </a>
  );
}
