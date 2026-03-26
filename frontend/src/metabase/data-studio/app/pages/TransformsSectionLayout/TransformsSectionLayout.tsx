import type { ReactNode } from "react";
import { t } from "ttag";

import { useSetting } from "metabase/common/hooks";
import { usePageTitle } from "metabase/hooks/use-page-title";
import { useSelector } from "metabase/lib/redux";
import { EnableTransformsPage } from "metabase/transforms/pages/EnableTransformsPage/EnableTransformsPage";
import { getShouldShowTransformsUpsell } from "metabase/transforms/selectors";

import { SectionLayout } from "../../components/SectionLayout";

type TransformsSectionLayoutProps = {
  children?: ReactNode;
};

export function TransformsSectionLayout({
  children,
}: TransformsSectionLayoutProps) {
  usePageTitle(t`Transforms`, { titleIndex: 1 });
  const shouldShowUpsell = useSelector(getShouldShowTransformsUpsell);
  const isTransformsEnabled = useSetting("transforms-enabled");

  if (!isTransformsEnabled || shouldShowUpsell) {
    return (
      <EnableTransformsPage
        isTransformsEnabled={isTransformsEnabled}
        shouldShowUpsell={shouldShowUpsell}
      />
    );
  }

  return <SectionLayout>{children}</SectionLayout>;
}
