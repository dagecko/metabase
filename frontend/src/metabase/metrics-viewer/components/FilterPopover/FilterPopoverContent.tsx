import cx from "classnames";
import { useCallback, useMemo, useState } from "react";
import { t } from "ttag";

import { AccordionList } from "metabase/common/components/AccordionList";
import { SourceColorIndicator } from "metabase/common/components/SourceColorIndicator";
import type {
  DimensionListItem,
  DimensionSection,
} from "metabase/metrics/components/FilterPicker/FilterDimensionPicker/types";
import { getMetricGroups } from "metabase/metrics/components/FilterPicker/FilterDimensionPicker/utils";
import { FilterPickerBody } from "metabase/metrics/components/FilterPicker/FilterPickerBody";
import { getDimensionIcon } from "metabase/metrics/utils/dimensions";
import type { IconName } from "metabase/ui";
import { Box, Flex, Icon, Text, TextInput, UnstyledButton } from "metabase/ui";
import type {
  DimensionMetadata,
  FilterClause,
  MetricDefinition,
} from "metabase-lib/metric";

import type {
  MetricSourceId,
  MetricsViewerDefinitionEntry,
  MetricsViewerFormulaEntity,
  SourceColorMap,
} from "../../types/viewer-state";
import { isExpressionEntry, isMetricEntry } from "../../types/viewer-state";

import S from "./FilterPopover.module.css";
import { filterDisplayGroupsBySearch } from "./utils";

const LIST_WIDTH = "20rem";
const FILTER_WIDTH = "24rem";

export type DefinitionSource = {
  id: MetricSourceId;
  definition: MetricDefinition;
  count?: number;
};

type NavigationState =
  | { view: "list" }
  | { view: "filter"; definitionIndex: number; dimension: DimensionMetadata };

type DisplayMetricGroup = {
  id: MetricSourceId;
  metricName: string;
  icon: IconName;
  colors: string[] | undefined;
  sections: DimensionSection[];
};

interface FilterPopoverContentProps {
  formulaEntities: MetricsViewerFormulaEntity[];
  definitions: Record<MetricSourceId, MetricsViewerDefinitionEntry>;
  metricColors: SourceColorMap;
  onFilterApplied: (id: MetricSourceId, filter: FilterClause) => void;
}

function getDefinitionSources(
  formulaEntities: MetricsViewerFormulaEntity[],
  definitions: Record<MetricSourceId, MetricsViewerDefinitionEntry>,
): DefinitionSource[] {
  type MaybeDefinitionSource = Omit<DefinitionSource, "definition"> & {
    definition: MetricDefinition | null;
  };
  const maybeDefinitionSources: MaybeDefinitionSource[] =
    formulaEntities.flatMap((entity) => {
      if (isMetricEntry(entity)) {
        return [
          {
            id: entity.id,
            definition: entity.definition ?? definitions[entity.id]?.definition,
          },
        ];
      }
      if (isExpressionEntry(entity)) {
        return entity.tokens
          .filter((token) => token.type === "metric")
          .map((token) => ({
            id: token.sourceId,
            definition:
              token.definition ?? definitions[token.sourceId]?.definition,
            count: token.count,
          }));
      }
      return [];
    });
  return maybeDefinitionSources.filter(
    (source): source is DefinitionSource => source.definition != null,
  );
}

export function FilterPopoverContent({
  formulaEntities,
  definitions,
  metricColors,
  onFilterApplied,
}: FilterPopoverContentProps) {
  const definitionSources = useMemo(
    () => getDefinitionSources(formulaEntities, definitions),
    [formulaEntities, definitions],
  );
  const [navState, setNavState] = useState<NavigationState>({ view: "list" });
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");

  const displayGroups = useMemo((): DisplayMetricGroup[] => {
    const rawGroups = getMetricGroups(
      definitionSources.map((source) => source.definition),
    );
    return rawGroups.map((group, index) => {
      const sourceId = definitionSources[index].id;
      return {
        id: sourceId,
        metricName: group.metricName,
        icon: group.icon,
        colors: metricColors[sourceId],
        sections: group.sections,
      };
    });
  }, [definitionSources, metricColors]);

  const filteredDisplayGroups = useMemo(
    () => filterDisplayGroupsBySearch(displayGroups, searchText),
    [displayGroups, searchText],
  );

  const handleDimensionSelect = useCallback((item: DimensionListItem) => {
    setNavState({
      view: "filter",
      definitionIndex: item.definitionIndex,
      dimension: item.dimension,
    });
  }, []);

  const handleBack = useCallback(() => {
    setNavState({ view: "list" });
  }, []);

  const handleFilterSelect = useCallback(
    (filter: FilterClause) => {
      if (navState.view !== "filter") {
        return;
      }
      const selected = definitionSources[navState.definitionIndex];
      if (!selected || selected.definition == null) {
        return;
      }
      onFilterApplied(selected.id, filter);
      setNavState({ view: "list" });
    },
    [navState, definitionSources, onFilterApplied],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }, []);

  const isSearching = filteredDisplayGroups !== null;
  const visibleGroups = isSearching ? filteredDisplayGroups : displayGroups;
  const hasNoResults = isSearching && visibleGroups.length === 0;
  const showMetricHeaders = definitionSources.length > 1;

  if (navState.view === "filter") {
    const selected = definitionSources[navState.definitionIndex];
    if (!selected) {
      return null;
    }
    return (
      <Box w={FILTER_WIDTH}>
        <FilterPickerBody
          definition={selected.definition}
          dimension={navState.dimension}
          isNew
          onSelect={handleFilterSelect}
          onBack={handleBack}
        />
      </Box>
    );
  }

  return (
    <>
      <Box w={LIST_WIDTH} p="sm" className={S.searchSection}>
        <TextInput
          placeholder={t`Search dimensions...`}
          value={searchText}
          onChange={(event) => setSearchText(event.currentTarget.value)}
          leftSection={<Icon name="search" size={16} />}
          size="md"
          radius="md"
        />
      </Box>

      <Box w={LIST_WIDTH} className={S.listSection} flex={1} mih={0}>
        {hasNoResults ? (
          <Box p="xl">
            <Text c="text-secondary" ta="center">
              {t`No dimensions found`}
            </Text>
          </Box>
        ) : showMetricHeaders ? (
          <MetricGroupList
            groups={visibleGroups}
            expandedItems={expandedItems}
            collapsible={!isSearching}
            onToggleExpanded={toggleExpanded}
            onDimensionSelect={handleDimensionSelect}
          />
        ) : (
          <DimensionList
            sections={visibleGroups[0]?.sections ?? []}
            onSelect={handleDimensionSelect}
          />
        )}
      </Box>
    </>
  );
}

function DimensionList({
  sections,
  onSelect,
}: {
  sections: DimensionSection[];
  onSelect: (item: DimensionListItem) => void;
}) {
  const renderItemIcon = useCallback((item: DimensionListItem) => {
    const icon = getDimensionIcon(item.dimension);
    return <Icon name={icon} size={16} />;
  }, []);

  return (
    <AccordionList<DimensionListItem, DimensionSection>
      className={S.dimensionList}
      sections={sections}
      onChange={onSelect}
      renderItemName={(item) => item.name}
      renderItemIcon={renderItemIcon}
      width="100%"
      maxHeight={Infinity}
      searchable={false}
      alwaysExpanded
    />
  );
}

function MetricGroupList({
  groups,
  expandedItems,
  collapsible,
  onToggleExpanded,
  onDimensionSelect,
}: {
  groups: DisplayMetricGroup[];
  expandedItems: string[];
  collapsible: boolean;
  onToggleExpanded: (id: string) => void;
  onDimensionSelect: (item: DimensionListItem) => void;
}) {
  return (
    <Box>
      {groups.map((group) => {
        const isExpanded = !collapsible || expandedItems.includes(group.id);
        const hasDimensions = group.sections.some(
          (section) => section.items && section.items.length > 0,
        );
        const showDimensions = isExpanded && hasDimensions;

        return (
          <Box key={group.id} className={S.accordionItem}>
            {collapsible ? (
              <UnstyledButton
                className={cx(S.accordionControl, {
                  [S.accordionControlExpanded]: showDimensions,
                })}
                onClick={() => onToggleExpanded(group.id)}
                w="100%"
              >
                <Flex align="center" gap="sm" px="md">
                  <SourceColorIndicator
                    colors={group.colors}
                    fallbackIcon={group.icon}
                    size={16}
                  />
                  <Box fw={700}>{group.metricName}</Box>
                  <Icon
                    name={isExpanded ? "chevronup" : "chevrondown"}
                    size={12}
                  />
                </Flex>
              </UnstyledButton>
            ) : (
              <Box
                className={cx(S.accordionHeader, {
                  [S.accordionHeaderExpanded]: showDimensions,
                })}
                px="md"
              >
                <Flex align="center" gap="sm">
                  <SourceColorIndicator
                    colors={group.colors}
                    fallbackIcon={group.icon}
                    size={16}
                  />
                  <Box fw={700}>{group.metricName}</Box>
                </Flex>
              </Box>
            )}
            {showDimensions && (
              <Box pb="sm">
                <DimensionList
                  sections={group.sections}
                  onSelect={onDimensionSelect}
                />
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
