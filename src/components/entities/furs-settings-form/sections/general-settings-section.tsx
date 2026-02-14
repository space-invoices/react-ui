import type { Entity } from "@spaceinvoices/js-sdk";
import { AlertTriangle, Building2, ChevronRight, Settings, User } from "lucide-react";
import { type FC, type ReactNode, useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useUpdateEntity } from "@/ui/components/entities/entities.hooks";
import { Alert, AlertDescription } from "@/ui/components/ui/alert";
import { Button } from "@/ui/components/ui/button";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/ui/components/ui/form";
import { Input } from "@/ui/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/ui/components/ui/radio-group";
import { Separator } from "@/ui/components/ui/separator";
import { cn } from "@/ui/lib/utils";
import { useUpdateUserFursSettings, useUserFursSettings } from "../furs-settings.hooks";
import type { FursSettingsFormSchema, SectionType } from "../furs-settings-form";

interface GeneralSettingsSectionProps {
  form: UseFormReturn<FursSettingsFormSchema>;
  entity: Entity;
  t: (key: string) => string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
  wrapSection?: (section: SectionType, content: ReactNode) => ReactNode;
}

export const GeneralSettingsSection: FC<GeneralSettingsSectionProps> = ({
  form,
  entity,
  t,
  onSuccess,
  onError,
  wrapSection,
}) => {
  const wrap = (section: SectionType, content: ReactNode) => (wrapSection ? wrapSection(section, content) : content);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Entity info (local state for form)
  const [entityTaxNumber, setEntityTaxNumber] = useState("");
  const [entityAddress, setEntityAddress] = useState("");
  const [entityCity, setEntityCity] = useState("");
  const [entityPostCode, setEntityPostCode] = useState("");

  // Initialize entity fields from entity prop
  useEffect(() => {
    setEntityTaxNumber(entity.tax_number || "");
    setEntityAddress(entity.address || "");
    setEntityCity(entity.city || "");
    setEntityPostCode(entity.post_code || "");
  }, [entity.tax_number, entity.address, entity.city, entity.post_code]);

  const { mutate: updateEntity, isPending: isEntityUpdatePending } = useUpdateEntity({
    onSuccess: () => onSuccess?.(),
    onError: (error) => onError?.(error),
  });

  const handleSaveEntityInfo = () => {
    updateEntity({
      id: entity.id,
      data: {
        tax_number: entityTaxNumber || null,
        address: entityAddress || null,
        city: entityCity || null,
        post_code: entityPostCode || null,
      },
    });
  };

  // User operator settings (local state for form)
  const { data: userFursSettings, isLoading: userSettingsLoading } = useUserFursSettings(entity.id);
  const [operatorTaxNumber, setOperatorTaxNumber] = useState("");
  const [operatorLabel, setOperatorLabel] = useState("");

  // Initialize from user settings when loaded
  useEffect(() => {
    if (userFursSettings) {
      setOperatorTaxNumber(userFursSettings.operator_tax_number || "");
      setOperatorLabel(userFursSettings.operator_label || "");
    }
  }, [userFursSettings]);

  const { mutate: updateUserSettings, isPending: isUserSettingsPending } = useUpdateUserFursSettings({
    onSuccess: () => onSuccess?.(),
    onError: (error) => onError?.(error),
  });

  const handleSaveUserSettings = () => {
    updateUserSettings({
      entityId: entity.id,
      data: {
        operator_tax_number: operatorTaxNumber || undefined,
        operator_label: operatorLabel || undefined,
      },
    });
  };

  // Entity Information content
  const entityInfoContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
          <Building2 className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{t("Entity Information")}</h3>
          <p className="text-muted-foreground text-sm">{t("Required company details for FURS fiscalization")}</p>
        </div>
      </div>

      {!entity.tax_number && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{t("Tax number is required for FURS fiscalization")}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="entity-tax-number" className="font-medium text-sm">
            {t("Entity Tax Number")}
          </label>
          <Input
            id="entity-tax-number"
            placeholder="12345678"
            value={entityTaxNumber}
            onChange={(e) => setEntityTaxNumber(e.target.value)}
            className={cn("mt-2 h-10", !entity.tax_number && "border-destructive")}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            {t("Your company's tax number (must match FURS certificate)")}
          </p>
        </div>

        <div>
          <label htmlFor="entity-address" className="font-medium text-sm">
            {t("Address")}
          </label>
          <Input
            id="entity-address"
            value={entityAddress}
            onChange={(e) => setEntityAddress(e.target.value)}
            className="mt-2 h-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="entity-post-code" className="font-medium text-sm">
              {t("Post Code")}
            </label>
            <Input
              id="entity-post-code"
              value={entityPostCode}
              onChange={(e) => setEntityPostCode(e.target.value)}
              className="mt-2 h-10"
            />
          </div>
          <div>
            <label htmlFor="entity-city" className="font-medium text-sm">
              {t("City")}
            </label>
            <Input
              id="entity-city"
              value={entityCity}
              onChange={(e) => setEntityCity(e.target.value)}
              className="mt-2 h-10"
            />
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSaveEntityInfo}
          disabled={isEntityUpdatePending}
          className="cursor-pointer"
        >
          {isEntityUpdatePending ? t("Saving...") : t("Save Entity Info")}
        </Button>
      </div>
    </div>
  );

  // Operator Settings content
  const operatorContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{t("Your Operator Settings")}</h3>
          <p className="text-muted-foreground text-sm">{t("Your personal operator info for FURS invoices")}</p>
        </div>
      </div>

      {(!userFursSettings?.operator_tax_number || !userFursSettings?.operator_label) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{t("Operator tax number and label are required for FURS fiscalization")}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="operator-tax-number" className="font-medium text-sm">
            {t("Operator Tax Number")}
          </label>
          <Input
            id="operator-tax-number"
            placeholder="12345678"
            value={operatorTaxNumber}
            onChange={(e) => setOperatorTaxNumber(e.target.value)}
            className="mt-2 h-10"
            disabled={userSettingsLoading}
          />
          <p className="mt-1 text-muted-foreground text-xs">{t("Your tax number for FURS fiscalization")}</p>
        </div>

        <div>
          <label htmlFor="operator-label" className="font-medium text-sm">
            {t("Operator Label")}
          </label>
          <Input
            id="operator-label"
            placeholder={t("e.g. Cashier 1")}
            value={operatorLabel}
            onChange={(e) => setOperatorLabel(e.target.value)}
            className="mt-2 h-10"
            disabled={userSettingsLoading}
          />
          <p className="mt-1 text-muted-foreground text-xs">
            {t("Descriptive label for the operator (e.g. Cashier 1)")}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSaveUserSettings}
          disabled={isUserSettingsPending || userSettingsLoading}
          className="cursor-pointer"
        >
          {isUserSettingsPending ? t("Saving...") : t("Save Operator Settings")}
        </Button>
      </div>
    </div>
  );

  // Fiscalization Settings content
  const fiscalizationContent = (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">{t("Fiscalization Settings")}</h3>
          <p className="text-muted-foreground text-sm">{t("Configure FURS fiscalization behavior")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="numbering_strategy"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="font-medium text-sm">{t("Numbering Strategy")}</FormLabel>
              <FormDescription className="text-xs">
                {t("Choose how invoice numbers are assigned across your business premises")}
              </FormDescription>
              <FormControl>
                <RadioGroup onValueChange={field.onChange} value={field.value} className="grid gap-3 md:grid-cols-2">
                  <label
                    htmlFor="strategy-c"
                    className={cn(
                      "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50",
                      field.value === "C" && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="C" id="strategy-c" />
                      <span className="font-medium">{t("Centralized")}</span>
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-primary text-xs">{t("Recommended")}</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t("One sequence across all premises. Simpler to manage and track.")}
                    </p>
                  </label>
                  <label
                    htmlFor="strategy-b"
                    className={cn(
                      "flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50",
                      field.value === "B" && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="B" id="strategy-b" />
                      <span className="font-medium">{t("Per Device")}</span>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {t("Separate sequence per electronic device. For complex multi-location setups.")}
                    </p>
                  </label>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  // Advanced Settings content
  const advancedContent = (
    <div>
      <button
        type="button"
        onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
        className="flex w-full items-center gap-2 py-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className={cn("h-4 w-4 transition-transform", isAdvancedOpen && "rotate-90")} />
        <span className="font-medium text-sm">{t("Advanced Settings")}</span>
      </button>
      {isAdvancedOpen && (
        <div className="pt-4">
          <div className="space-y-4 rounded-lg border p-4">
            <div>
              <h4 className="font-medium text-sm">{t("API Default Operator")}</h4>
              <p className="text-muted-foreground text-xs">
                {t("Default operator settings for API key usage (when no user context)")}
              </p>
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="operator_tax_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t("Operator Tax Number")}</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} className="h-10" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t("Tax number for API key usage (optional)")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="operator_label"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">{t("Operator Label")}</FormLabel>
                    <FormControl>
                      <Input placeholder="API Default" {...field} className="h-10" />
                    </FormControl>
                    <FormDescription className="text-xs">
                      {t("Operator label for API key usage (optional)")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {wrap("entity-info", entityInfoContent)}
      <Separator />
      {wrap("operator", operatorContent)}
      <Separator />
      {wrap("fiscalization", fiscalizationContent)}
      <Separator />
      {wrap("advanced", advancedContent)}
    </div>
  );
};
