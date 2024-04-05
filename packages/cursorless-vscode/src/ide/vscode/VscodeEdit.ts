import { Edit } from "@cursorless/common";
import { toVscodePosition, toVscodeRange } from "@cursorless/vscode-common";
import type * as vscode from "vscode";

export default async function vscodeEdit(
  editor: vscode.TextEditor,
  edits: Edit[],
): Promise<boolean> {
  return await editor.edit((editBuilder) => {
    edits.forEach(({ range, text, isReplace }) => {
      if (text === "") {
        console.warn(`vscodeDelete(): range=${JSON.stringify(range)}`);
        editBuilder.delete(toVscodeRange(range));
      } else if (range.isEmpty && !isReplace) {
        console.warn(
          `vscodeInsert(): position=${JSON.stringify(range.start)}, text='${text}'`,
        );
        editBuilder.insert(toVscodePosition(range.start), text);
      } else {
        console.warn(
          `vscodeReplace(): position=${JSON.stringify(range)}, text='${text}'`,
        );
        editBuilder.replace(toVscodeRange(range), text);
      }
    });
  });
}
