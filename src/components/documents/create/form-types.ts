/**
 * Shared form types for document components.
 *
 * This file provides type utilities to handle react-hook-form's complex generic types
 * when passing control and other form utilities between components.
 */
import type { Control, UseFormGetValues, UseFormSetValue, UseFormWatch } from "react-hook-form";

/**
 * A more permissive Control type that accepts any form control.
 * Use this in component props when the component doesn't need to know
 * the exact form type, only that it has certain fields.
 */
export type AnyControl = Control<any, any, any>;

/**
 * Base props for document form sections that receive form utilities.
 * Components using these props can work with any form that has the expected fields.
 */
export type DocumentFormSectionProps = {
  control: AnyControl;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
};

/**
 * Props for components that only need control (no watch/setValue/getValues).
 */
export type ControlOnlyProps = {
  control: AnyControl;
};
