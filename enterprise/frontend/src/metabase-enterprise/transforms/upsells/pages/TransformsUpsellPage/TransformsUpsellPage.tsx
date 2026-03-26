import { jt, t } from "ttag";

import { LoadingAndErrorWrapper } from "metabase/common/components/LoadingAndErrorWrapper";
import { DataStudioBreadcrumbs } from "metabase/data-studio/common/components/DataStudioBreadcrumbs";
import { PaneHeader } from "metabase/data-studio/common/components/PaneHeader";
import { DottedBackground } from "metabase/data-studio/upsells/components/DottedBackground";
import { LineDecorator } from "metabase/data-studio/upsells/components/LineDecorator";
import { useSelector } from "metabase/lib/redux";
import { getStoreUsers } from "metabase/selectors/store-users";
import { Button, Card, Center, Flex, Stack, Text, Title } from "metabase/ui";

import { useTransformsBilling } from "../../hooks/useTransformsBilling";

import S from "./TransformsUpsellPage.module.css";

/**
 * Note: this upsell page should only be displayed to cloud customers since OSS and Self-hosted have
 * transforms enabled by default.
 */
export function TransformsUpsellPage() {
  const { isStoreUser } = useSelector(getStoreUsers);

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

  // TODO: Should there be an admin check?
  const canUserPurchase = hasData && isStoreUser;

  if (error || isLoading) {
    return (
      <DottedBackground px="3.5rem" pb="2rem">
        <PaneHeader
          breadcrumbs={
            <DataStudioBreadcrumbs>{t`Transforms`}</DataStudioBreadcrumbs>
          }
        />
        <Center h="100%" bg="background-secondary">
          <LoadingAndErrorWrapper
            loading={isLoading}
            error={
              error
                ? t`Error fetching information about available add-ons.`
                : null
            }
          />
        </Center>
      </DottedBackground>
    );
  }

  const freeUnits = 1000; // TODO: Get from api
  const freeUnitsStr = freeUnits.toLocaleString();
  const notifyThreshold = 0.8; // TODO: Get from api
  const perTransformRate = "TODO"; // TODO: Get from api

  return (
    <DottedBackground px="3.5rem" pb="2rem">
      <PaneHeader
        breadcrumbs={
          <DataStudioBreadcrumbs>{t`Transforms`}</DataStudioBreadcrumbs>
        }
      />
      <Flex
        align="flex-start"
        className={S.UpsellPageContent}
        justify="center"
        py="xl"
      >
        <LineDecorator>
          <Card withBorder p="3rem" w="40rem">
            <Stack gap="lg" align="start">
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
                    // TODO
                    // loading={updateSettingLoading}
                    variant="primary"
                    // onClick={enableTransforms}
                  >{t`Agree and continue`}</Button>
                </>
              )}
              <Text c="text-secondary" lh={1.4}>
                {t`By clicking agree and continue you agree to be charged in accordance with our terms of service. Your free transforms never expire, so they'll be waiting here for you when you'r ready.`}
              </Text>
            </Stack>
          </Card>
        </LineDecorator>
      </Flex>
    </DottedBackground>
  );
}
