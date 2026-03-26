import { useState } from "react";
import { t } from "ttag";

import { useListDatabasesQuery, useUpdateSettingMutation } from "metabase/api";
import { DataStudioBreadcrumbs } from "metabase/data-studio/common/components/DataStudioBreadcrumbs";
import { PageContainer } from "metabase/data-studio/common/components/PageContainer";
import { PaneHeader } from "metabase/data-studio/common/components/PaneHeader";
import { DottedBackground } from "metabase/data-studio/upsells/components/DottedBackground";
import { LineDecorator } from "metabase/data-studio/upsells/components/LineDecorator/LineDecorator";
import { useSelector } from "metabase/lib/redux";
import { PLUGIN_TRANSFORMS } from "metabase/plugins";
import { getUserIsAdmin } from "metabase/selectors/user";
import { doesDatabaseSupportTransforms } from "metabase/transforms/utils";
import {
  Alert,
  Box,
  Button,
  Card,
  Flex,
  Group,
  Icon,
  type IconName,
  Stack,
  Text,
  Title,
} from "metabase/ui";

export const EnableTransformsPage = ({
  isTransformsEnabled,
  shouldShowUpsell,
}: {
  isTransformsEnabled: boolean;
  shouldShowUpsell: boolean;
}) => {
  const isAdmin = useSelector(getUserIsAdmin);
  const [hasAgreedToEnable, setHasAgreedToEnable] =
    useState(isTransformsEnabled);

  const [updateSetting, { isLoading: updateSettingLoading }] =
    useUpdateSettingMutation();

  const enableTransforms = () => {
    if (shouldShowUpsell) {
      setHasAgreedToEnable(true);
      return;
    }
    updateSetting({
      key: "transforms-enabled",
      value: true,
    });
  };

  const { data: databases } = useListDatabasesQuery();
  const hasDbThatSupportsTransforms =
    databases?.data.some(doesDatabaseSupportTransforms) ?? false;

  return (
    <DottedBackground>
      <PageContainer data-testid="enable-transform-page">
        <PaneHeader
          breadcrumbs={
            <DataStudioBreadcrumbs>{t`Transforms`}</DataStudioBreadcrumbs>
          }
        />
        <Flex align="center" justify="center" flex="1" pb="6rem" w="100%">
          <LineDecorator maw="60rem" w="100%">
            <Card withBorder p="3rem" w="100%">
              <Flex w="100%">
                {!hasAgreedToEnable && (
                  <Stack gap="lg" align="start" pt="xl" pl="lg">
                    <Title
                      order={2}
                    >{t`Customize and clean up your data`}</Title>
                    <Text
                      c="text-secondary"
                      fz="1rem"
                      lh={1.4}
                    >{t`Transforms let you create new tables within your connected databases, helping you make nicer and more self-explanatory datasets for your end users to look at and explore.`}</Text>
                    {isAdmin && (
                      <>
                        <Text
                          c="text-secondary"
                          fz="1rem"
                          lh={1.4}
                          fw="bold"
                        >{t`Because transforms require write access to your database, make sure you know what you’re doing and that you understand the risks.`}</Text>
                        <Button
                          loading={updateSettingLoading}
                          variant="primary"
                          onClick={enableTransforms}
                        >{t`Enable transforms`}</Button>
                        {!hasDbThatSupportsTransforms && (
                          <Alert
                            color="warning"
                            variant="light"
                            icon={<Icon name="warning" size={16} />}
                            py="md"
                          >
                            {t`None of your connected databases have a writeable connection`}
                          </Alert>
                        )}
                      </>
                    )}
                  </Stack>
                )}
                <Box flex={1} display={!hasAgreedToEnable ? "none" : undefined}>
                  {/* Mounted while hidden to pre-fetch anything it might need */}
                  <PLUGIN_TRANSFORMS.TransformsUpsellPage />
                </Box>
                <Stack flex="0 0 16rem" ml="4rem">
                  <SimpleCard
                    icon="sql"
                    title={t`Custom tables`}
                    description={t`Create the tables your end users need with SQL queries`}
                  />
                  <SimpleCard
                    icon="clock"
                    title={t`Smart scheduling`}
                    description={t`Tell your transforms when to run by assigning tags`}
                  />
                  <SimpleCard
                    icon="eye"
                    title={t`Observability`}
                    description={t`See which transforms ran, and when`}
                  />
                  <SimpleCard
                    icon="lock"
                    title={t`Permissioned`}
                    description={t`Control who can create and run transforms`}
                  />
                </Stack>
              </Flex>
            </Card>
          </LineDecorator>
        </Flex>
      </PageContainer>
    </DottedBackground>
  );
};

const SimpleCard = ({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) => (
  <Card bg="background-secondary" shadow="none">
    <Group wrap="nowrap" align="start" gap="sm">
      <Icon name={icon} c="brand" size={16} flex="0 0 1rem" />
      <Stack gap="xs">
        <Text fw="bold" lh="1rem">
          {title}
        </Text>
        <Text fz="sm" lh="1rem">
          {description}
        </Text>
      </Stack>
    </Group>
  </Card>
);
