import {
  CommandResponse,
  ExcludableSnapshotField,
  Fallback,
  Position,
  PositionPlainObject,
  ReadOnlyHatMap,
  Selection,
  SelectionPlainObject,
  SerializedMarks,
  SpyIDE,
  TestCaseFixtureLegacy,
  TextEditor,
  TokenHat,
  asyncSafety,
  clientSupportsFallback,
  extractTargetedMarks,
  getRecordedTestPaths,
  marksToPlainObject,
  omitByDeep,
  plainObjectToRange,
  rangeToPlainObject,
  serializeTestFixture,
  shouldUpdateFixtures,
  splitKey,
  spyIDERecordedValuesToPlainObject,
  storedTargetKeys,
} from "@cursorless/common";
import {
  NeovimIDE,
  getCursorlessApi,
  openNewEditor,
  runCursorlessCommand,
} from "@cursorless/neovim-common";
import { assert } from "chai";
import * as yaml from "js-yaml";
import { isUndefined } from "lodash";
import { promises as fsp } from "node:fs";
import { endToEndTestSetup, sleepWithBackoff } from "../endToEndTestSetup";

function createPosition(position: PositionPlainObject) {
  return new Position(position.line, position.character);
}

function createSelection(selection: SelectionPlainObject): Selection {
  const active = createPosition(selection.active);
  const anchor = createPosition(selection.anchor);
  return new Selection(anchor, active);
}

suite("recorded test cases", async function () {
  const { getSpy, getNeovimIDE } = endToEndTestSetup(this);

  suiteSetup(async () => {
    // const { ide } = (await getCursorlessApi()).testHelpers!;
  });

  const tests = getRecordedTestPaths();

  for (const { name, path } of tests) {
    test(
      name,
      asyncSafety(() => runTest(this, name, path, getSpy()!, getNeovimIDE()!)),
    );
  }
});

async function runTest(
  suite: Mocha.Suite,
  name: string,
  file: string,
  spyIde: SpyIDE,
  neovimIDE: NeovimIDE,
) {
  /**
   * The neovim client is set by the test runner in test-harness/src/index.ts into the global object.
   * This allows us to access it in the tests that are executed through mocha.
   */
  const client = (global as any).additionalParameters.client;

  const buffer = await fsp.readFile(file);
  const fixture = yaml.load(buffer.toString()) as TestCaseFixtureLegacy;
  const excludeFields: ExcludableSnapshotField[] = [];

  if (unsupportedFixture(name, fixture)) {
    return suite.ctx.skip();
  }

  // FIXME The snapshot gets messed up with timing issues when running the recorded tests
  // "Couldn't find token default.a"
  const usePrePhraseSnapshot = false;

  const cursorlessApi = await getCursorlessApi();
  const { hatTokenMap, takeSnapshot, setStoredTarget, commandServerApi } =
    cursorlessApi.testHelpers!;

  const editor = await openNewEditor(
    client,
    neovimIDE,
    fixture.initialState.documentContents,
    {
      languageId: fixture.languageId,
    },
  );

  if (fixture.postEditorOpenSleepTimeMs != null) {
    await sleepWithBackoff(fixture.postEditorOpenSleepTimeMs);
  }

  await editor.setSelections(
    fixture.initialState.selections.map(createSelection),
  );

  for (const storedTargetKey of storedTargetKeys) {
    const key = `${storedTargetKey}Mark` as const;
    setStoredTarget(editor, storedTargetKey, fixture.initialState[key]);
  }

  if (fixture.initialState.clipboard) {
    spyIde.clipboard.writeText(fixture.initialState.clipboard);
  }

  commandServerApi.setFocusedElementType(fixture.focusedElementType);

  // Ensure that the expected hats are present
  await hatTokenMap.allocateHats(
    getTokenHats(fixture.initialState.marks, spyIde.activeTextEditor!),
  );

  const readableHatMap = await hatTokenMap.getReadableMap(usePrePhraseSnapshot);

  // Assert that recorded decorations are present
  checkMarks(fixture.initialState.marks, readableHatMap);

  let returnValue: unknown;
  let fallback: Fallback | undefined;

  try {
    returnValue = await runCursorlessCommand({
      ...fixture.command,
      usePrePhraseSnapshot,
    });
    if (clientSupportsFallback(fixture.command)) {
      const commandResponse = returnValue as CommandResponse;
      returnValue =
        "returnValue" in commandResponse
          ? commandResponse.returnValue
          : undefined;
      fallback =
        "fallback" in commandResponse ? commandResponse.fallback : undefined;
    }
  } catch (err) {
    const error = err as Error;

    if (shouldUpdateFixtures()) {
      const outputFixture = {
        ...fixture,
        finalState: undefined,
        decorations: undefined,
        returnValue: undefined,
        thrownError: { name: error.name },
      };

      await fsp.writeFile(file, serializeTestFixture(outputFixture));
    } else if (fixture.thrownError != null) {
      assert.strictEqual(
        error.name,
        fixture.thrownError.name,
        "Unexpected thrown error",
      );
    } else {
      throw error;
    }

    return;
  }

  if (fixture.postCommandSleepTimeMs != null) {
    await sleepWithBackoff(fixture.postCommandSleepTimeMs);
  }

  const marks =
    fixture.finalState?.marks == null
      ? undefined
      : marksToPlainObject(
          extractTargetedMarks(
            Object.keys(fixture.finalState.marks),
            readableHatMap,
          ),
        );

  if (fixture.finalState?.clipboard == null) {
    excludeFields.push("clipboard");
  }

  for (const storedTargetKey of storedTargetKeys) {
    const key = `${storedTargetKey}Mark` as const;
    if (fixture.finalState?.[key] == null) {
      excludeFields.push(key);
    }
  }

  // FIXME Visible ranges are not asserted, see:
  // https://github.com/cursorless-dev/cursorless/issues/160
  const { visibleRanges, ...resultState } = await takeSnapshot(
    excludeFields,
    [],
    spyIde.activeTextEditor!,
    spyIde,
    marks,
  );

  const rawSpyIdeValues = spyIde.getSpyValues(fixture.ide?.flashes != null);
  const actualSpyIdeValues =
    rawSpyIdeValues == null
      ? undefined
      : spyIDERecordedValuesToPlainObject(rawSpyIdeValues);

  if (shouldUpdateFixtures()) {
    const outputFixture: TestCaseFixtureLegacy = {
      ...fixture,
      finalState: resultState,
      returnValue,
      fallback,
      ide: actualSpyIdeValues,
      thrownError: undefined,
    };

    await fsp.writeFile(file, serializeTestFixture(outputFixture));
  } else {
    if (fixture.thrownError != null) {
      throw Error(
        `Expected error ${fixture.thrownError.name} but none was thrown`,
      );
    }

    assert.deepStrictEqual(
      resultState,
      fixture.finalState,
      "Unexpected final state",
    );

    assert.deepStrictEqual(
      returnValue,
      fixture.returnValue,
      "Unexpected return value",
    );

    assert.deepStrictEqual(
      fallback,
      fixture.fallback,
      "Unexpected fallback value",
    );

    assert.deepStrictEqual(
      omitByDeep(actualSpyIdeValues, isUndefined),
      fixture.ide,
      "Unexpected ide captured values",
    );
  }
}

function checkMarks(
  marks: SerializedMarks | undefined,
  hatTokenMap: ReadOnlyHatMap,
) {
  if (marks == null) {
    return;
  }

  Object.entries(marks).forEach(([key, token]) => {
    const { hatStyle, character } = splitKey(key);
    const currentToken = hatTokenMap.getToken(hatStyle, character);
    assert(currentToken != null, `Mark "${hatStyle} ${character}" not found`);
    assert.deepStrictEqual(rangeToPlainObject(currentToken.range), token);
  });
}

function getTokenHats(
  marks: SerializedMarks | undefined,
  editor: TextEditor,
): TokenHat[] {
  if (marks == null) {
    return [];
  }

  return Object.entries(marks).map(([key, token]) => {
    const { hatStyle, character } = splitKey(key);
    const range = plainObjectToRange(token);

    return {
      hatStyle,
      grapheme: character,
      token: {
        editor,
        range,
        offsets: {
          start: editor.document.offsetAt(range.start),
          end: editor.document.offsetAt(range.end),
        },
        text: editor.document.getText(range),
      },

      // NB: We don't care about the hat range for this test
      hatRange: range,
    };
  });
}

const failingFixtures = [
  // actual finalState.selections.anchor is -1 compared to expected (other fixture.command.action.name == "insertCopyBefore" tests pass fine)
  "recorded/actions/cloneToken4",
  "recorded/actions/cloneUpToken4",
  // -> Error: nvim_execute_lua: Cursor position outside buffer
  "recorded/compoundTargets/chuckStartOfBlockPastStartOfFile",
  // actual finalState.selections.anchor is -1 compared to expected
  "recorded/implicitExpansion/chuckCoreThat",
  "recorded/implicitExpansion/chuckLeadingThat",
  "recorded/marks/chuckNothing",
  // -> wrong fixture.finalState.selections
  "recorded/implicitExpansion/cloneThat2",
  "recorded/implicitExpansion/cloneThis",
  "recorded/implicitExpansion/cloneThis2",
];

function isFailingFixture(name: string, fixture: TestCaseFixtureLegacy) {
  const action =
    typeof fixture.command.action === "object"
      ? fixture.command.action.name
      : fixture.command.action;

  switch (action) {
    // "recorded/actions/insertEmptyLines/puffThis*" -> wrong fixture.finalState.selections and fixture.thatMark.contentRange
    case "insertEmptyLinesAround":
      return true;
    // "recorded/actions/insertEmptyLines/floatThis*" ->    Error: nvim_buf_get_lines: Index out of bounds
    //                                                -> or actual finalState.selections.anchor is -1 compared to expected
    //                                                      actual finalState.thatMark.contentRange.start is -1 compared to expected
    case "insertEmptyLineAfter":
      return true;
    // "recorded/actions/insertEmptyLines/dropThis*"  -> wrong fixture.finalState.selections and fixture.thatMark.contentRange
    case "insertEmptyLineBefore":
      return true;
    // "recorded/actions/cloneToken*" and "recorded/itemTextual/cloneTwoItems" -> wrong fixture.finalState.selections and fixture.thatMark.contentRange
    case "insertCopyAfter":
      return true;
    // "recorded/implicitExpansion/pour*" -> not supported for now
    case "editNewLineAfter":
      return true;
    // "recorded/actions/{decrement,increment}File" -> are not supported atm
    case "decrement":
      return true;
    case "increment":
      return true;
    // "recorded/actions/snippets/*" -> not supported for now
    case "insertSnippet":
      return true;
    case "wrapWithSnippet":
      return true;
    // "recorded/actions/insertEmptyLines/floatThis*" -> wrong fixture.finalState.selections and fixture.thatMark.contentRange
    case "breakLine":
      return true;
    case "joinLines":
      return true;
    // "recorded/actions/shuffleThis" is not supported atm
    case "randomizeTargets":
      return true;
    // "recorded/actions/pasteBeforeToken" -> wrong fixture.finalState.documentContents/selections/thatMark
    case "pasteFromClipboard":
      return true;
    // "recorded/actions/copySecondToken" -> wrong fixture.finalState.clipboard
    case "copyToClipboard":
      return true;
  }

  // "recorded/lineEndings/*" -> fixture.finalState.documentContents contains \n instead of \r\n
  if (name.includes("/lineEndings/")) {
    return true;
  }

  // "recorded/fallback/take*" -> wrong fixture.finalState.selections
  if (name.includes("/fallback/take")) {
    return true;
  }

  // We blacklist remaining unsorted failing tests
  if (failingFixtures.includes(name)) {
    return true;
  }

  return false;
}

function unsupportedFixture(name: string, fixture: TestCaseFixtureLegacy) {
  // We don't support decorated symbol marks (hats) yet
  const hasMarks =
    fixture.initialState.marks != null &&
    Object.keys(fixture.initialState.marks).length > 0;

  // we don't support multiple selections in neovim (we don't support multiple cursors atm)
  const hasMultipleSelections =
    fixture.initialState.selections.length > 1 ||
    (fixture.finalState && fixture.finalState.selections.length > 1);

  // We don't support Tree sitter yet (which requires a code languageId)
  const needTreeSitter = fixture.languageId !== "plaintext";

  if (hasMarks || hasMultipleSelections || needTreeSitter) {
    return true;
  }

  // Fixtures that will need to be fixed in the future
  if (isFailingFixture(name, fixture)) {
    return true;
  }

  return false;
}
