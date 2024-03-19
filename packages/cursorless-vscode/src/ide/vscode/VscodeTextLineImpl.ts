import { Range, TextLine } from "@cursorless/common";
import { fromVscodeRange } from "@cursorless/vscode-common";
import * as vscode from "vscode";

export default class VscodeTextLineImpl implements TextLine {
  constructor(private line: vscode.TextLine) {}

  get lineNumber(): number {
    return this.line.lineNumber;
  }

  get text(): string {
    console.warn(`VscodeTextLineImpl.text()='${this.line.text}'`);
    return this.line.text;
  }

  get range(): Range {
    return fromVscodeRange(this.line.range);
  }

  get rangeIncludingLineBreak(): Range {
    return fromVscodeRange(this.line.rangeIncludingLineBreak);
  }

  get firstNonWhitespaceCharacterIndex(): number {
    return this.line.firstNonWhitespaceCharacterIndex;
  }

  get lastNonWhitespaceCharacterIndex(): number {
    console.warn(
      `VscodeTextLineImpl.lastNonWhitespaceCharacterIndex() index=${this.line.range.end.character}`,
    );
    return this.line.text.trimEnd().length;
  }

  get isEmptyOrWhitespace(): boolean {
    return this.line.isEmptyOrWhitespace;
  }
}
