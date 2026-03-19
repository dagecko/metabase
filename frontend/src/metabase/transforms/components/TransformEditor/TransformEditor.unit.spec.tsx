import { render, screen } from "@testing-library/react";

import { useSelector } from "metabase/lib/redux";
import { useRegisterMetabotTransformContext } from "metabase/transforms/hooks/use-register-transform-metabot-context";
import type { QueryTransformSource } from "metabase-types/api";
import { createMockTransform } from "metabase-types/api/mocks";

import { TransformEditor, type TransformEditorProps } from "./TransformEditor";

jest.mock("metabase/lib/redux", () => ({
  useSelector: jest.fn(),
}));

jest.mock("metabase/querying/editor/components/QueryEditor", () => ({
  QueryEditor: () => <div data-testid="query-editor" />,
}));

jest.mock("metabase/selectors/metadata", () => ({
  getMetadata: jest.fn(),
}));

jest.mock("./EditDefinitionButton", () => ({
  EditDefinitionButton: () => null,
}));

jest.mock(
  "metabase/transforms/hooks/use-register-transform-metabot-context",
  () => ({
    useRegisterMetabotTransformContext: jest.fn(),
  }),
);

jest.mock("metabase-lib", () => ({
  fromJsQueryAndMetadata: jest.fn((_metadata, query) => query),
  toJsQuery: jest.fn((query) => query),
}));

jest.mock("metabase/plugins", () => ({
  PLUGIN_REMOTE_SYNC: {
    getIsRemoteSyncReadOnly: jest.fn(),
  },
  PLUGIN_WORKSPACES: {
    isEnabled: false,
  },
}));

const mockUseSelector = jest.mocked(useSelector);

const mockUseRegisterMetabotTransformContext = jest.mocked(
  useRegisterMetabotTransformContext,
);

const mockSource: QueryTransformSource = {
  type: "query",
  query: {
    database: 1,
    type: "query",
    query: {
      "source-table": 1,
    },
  },
};

function setup(props: Partial<TransformEditorProps> = {}) {
  render(
    <TransformEditor
      source={mockSource}
      proposedSource={undefined}
      databases={[]}
      uiState={{} as TransformEditorProps["uiState"]}
      onChangeSource={jest.fn()}
      onChangeUiState={jest.fn()}
      onAcceptProposed={jest.fn()}
      onRejectProposed={jest.fn()}
      isEditMode
      readOnly
      {...props}
    />,
  );
}

describe("TransformEditor", () => {
  beforeEach(() => {
    let selectorCallCount = 0;
    mockUseSelector.mockReset();
    mockUseSelector.mockImplementation(() =>
      selectorCallCount++ === 0 ? {} : false,
    );
    mockUseRegisterMetabotTransformContext.mockClear();
  });

  it("registers metabot context for saved query transforms when enabled", () => {
    const transform = createMockTransform({
      source_type: "mbql",
      source: mockSource,
    });

    setup({
      transform,
      metabotError: "syntax error",
      withMetabotContext: true,
    });

    expect(screen.getByTestId("query-editor")).toBeInTheDocument();
    expect(mockUseRegisterMetabotTransformContext).toHaveBeenCalledWith(
      transform,
      mockSource,
      "syntax error",
    );
  });

  it("registers metabot context for draft query transforms when enabled", () => {
    setup({ withMetabotContext: true });

    expect(mockUseRegisterMetabotTransformContext).toHaveBeenCalledWith(
      undefined,
      mockSource,
      undefined,
    );
  });

  it("does not register metabot context when disabled", () => {
    setup();

    expect(mockUseRegisterMetabotTransformContext).not.toHaveBeenCalled();
  });
});
