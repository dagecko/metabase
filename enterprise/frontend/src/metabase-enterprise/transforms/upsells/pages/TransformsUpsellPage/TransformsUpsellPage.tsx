import { useCallback } from "react";
import { jt, t } from "ttag";

import { useUpdateSettingMutation } from "metabase/api/settings";
import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { useSelector } from "metabase/lib/redux";
import { useMetadataToasts } from "metabase/metadata/hooks/useMetadataToasts";
import { getStoreUsers } from "metabase/selectors/store-users";
import { Button, Stack, Text, Title } from "metabase/ui";
import { usePurchaseCloudAddOnMutation } from "metabase-enterprise/api/cloud-add-ons";

import { useTransformsBilling } from "../../hooks/useTransformsBilling";

/**
 * Note: this upsell page should only be displayed to cloud customers since OSS and Self-hosted have
 * transforms enabled by default.
 */
export function TransformsUpsellPage() {
  const { isStoreUser } = useSelector(getStoreUsers);
  const [updateSetting] = useUpdateSettingMutation();

  // TODO: Check for unused props in useTransformsBilling
  const {
    advancedTransformsAddOn,
    basicTransformsAddOn,
    billingPeriodMonths,
    error,
    isLoading,
  } = useTransformsBilling();

  const hasData =
    billingPeriodMonths !== undefined &&
    (basicTransformsAddOn || advancedTransformsAddOn);

  const { sendErrorToast } = useMetadataToasts();
  const [purchaseCloudAddOn, { isLoading: isPurchasing }] =
    usePurchaseCloudAddOnMutation();
  const handlePurchase = useCallback(async () => {
    try {
      await updateSetting({
        key: "transforms-enabled",
        value: true,
      }).unwrap();
      await purchaseCloudAddOn({
        product_type: "transforms-basic-metered",
      }).unwrap();
      window.location.reload();
    } catch {
      sendErrorToast(
        t`It looks like something went wrong. Please refresh the page and try again.`,
      );
    }
  }, [purchaseCloudAddOn, sendErrorToast, updateSetting]);

  // TODO: Should there be an admin check?
  const canUserPurchase = hasData && isStoreUser;

  if (error || isLoading) {
    return (
      <LoadingAndErrorWrapper
        loading={isLoading}
        error={
          error ? t`Error fetching information about available add-ons.` : null
        }
      />
    );
  }

  const freeUnits = 1000; // TODO: Get from api
  const freeUnitsStr = freeUnits.toLocaleString();
  const notifyThreshold = 0.8; // TODO: Get from api
  const perTransformRate = "TODO"; // TODO: Get from api

  return (
    <Stack gap="lg" align="start" pt="xl" pl="lg">
      <Title order={2}>{t`${freeUnitsStr} free transform runs`}</Title>
      <Text
        c="text-secondary"
        fz="1rem"
        lh={1.4}
      >{jt`Your cloud plan comes with ${freeUnitsStr} transform runs ${(<strong key="bold">{t`completely free`}</strong>)}. After you use your ${freeUnitsStr} runs you'll be charged ${perTransformRate} per run. You only pay for what you use.`}</Text>
      <Text
        c="text-secondary"
        fz="1rem"
        lh={1.4}
      >{t`We'll notify you when you've hit ${notifyThreshold * 100}% of your allotment.`}</Text>
      {canUserPurchase && (
        <>
          <Button
            loading={isPurchasing}
            variant="primary"
            onClick={handlePurchase}
          >{t`Agree and continue`}</Button>
        </>
      )}
      <Text c="text-secondary" lh={1.4}>
        {t`By clicking agree and continue you agree to be charged in accordance with our terms of service. Your free transforms never expire, so they'll be waiting here for you when you'r ready.`}
      </Text>
    </Stack>
  );
}
