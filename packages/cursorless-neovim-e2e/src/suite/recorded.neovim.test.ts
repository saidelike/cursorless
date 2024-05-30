import {
  Command,
  SpyIDE,
  TestCaseFixtureLegacy,
  asyncSafety,
  getRecordedTestPaths,
  runRecordedTest,
} from "@cursorless/common";
import {
  NeovimIDE,
  getCursorlessApi,
  openNewTestEditor,
  runCursorlessCommand,
} from "@cursorless/neovim-common";
import { endToEndTestSetup, sleepWithBackoff } from "../endToEndTestSetup";
import { shouldRunTest } from "../shouldRunTest";

suite("recorded test cases", async function () {
  const { getSpy, getNeovimIDE } = endToEndTestSetup(this);

  suiteSetup(async () => {});

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

  await runRecordedTest(
    suite,
    file,
    spyIde,
    (fixture: TestCaseFixtureLegacy) => {
      return shouldRunTest(name, fixture);
    },
    async (content: string, languageId: string) => {
      return await openNewTestEditor(client, neovimIDE, content, {
        languageId,
      });
    },
    sleepWithBackoff,
    getCursorlessApi,
    runCursorlessCommand as (command: Command) => Promise<any>,
  );
}
