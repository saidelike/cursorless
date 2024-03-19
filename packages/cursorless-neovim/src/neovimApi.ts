// Helper directly calling into Neovim apis, generally lua, exported by talon.nvim
import { Position, Range, Selection } from "@cursorless/common";
import { NeovimClient } from "neovim/lib/api/client";
import { Window } from "neovim/lib/api/Window";

/**
 * Get the current "selections" in the window(editor)
 *
 * TODO: at the moment we only support one selection because vim only support one cursor
 * TODO: support any window as atm only supports the current window
 */
export async function bufferGetSelections(
  window: Window,
  client: NeovimClient,
): Promise<Selection[]> {
  const luaCode = `return require("talon.cursorless").buffer_get_selection()`;
  // Note lines are indexed from 1, similarly to what is shown in neovim
  // and columns are also indexed from 1
  const result = (await client.executeLua(luaCode, [])) as Array<
    number | boolean
  >;
  // console.warn(`bufferGetSelection(): result=${result}`);
  // TODO: there must be a more beautiful way to get the returned values with the right types
  const startLine = result[0] as number,
    startCol = result[1] as number,
    endLine = result[2] as number,
    endCol = result[3] as number,
    reverse = result[4] as boolean;
  // subtract 1 to the lines/columns to get the correct 0-based line/column numbers
  if (reverse === true) {
    return [
      new Selection(
        new Position(endLine - 1, endCol - 1),
        new Position(startLine - 1, startCol - 1),
      ),
    ];
  }
  return [
    new Selection(
      new Position(startLine - 1, startCol - 1),
      new Position(endLine - 1, endCol - 1),
    ),
  ];
}

export async function bufferSetSelections(
  // window: Window,
  client: NeovimClient,
  selections: Selection[],
) {
  if (selections.length !== 1) {
    throw new Error("bufferSetSelections() only supports one selection");
  }

  // cursorless has 0-based lines/columns, but neovim has 1-based lines and 0-based columns
  // also, experience shows we need to subtract 1 from the end character to stop on it in visual mode (instead of after it)
  // https://neovim.io/doc/user/api.html#nvim_win_set_cursor()

  // TODO: this works fine for the "take" command
  // let endIndex = selections[0].end.character - 1;
  // TODO: this is mostly to avoid an out of bound when calling the lua function: nvim_win_set_cursor()
  // if (endIndex === -1) {
  //   endIndex = 0;
  // }

  // TODO: this works fine for the "copy" command, and for resetting the selection
  const endIndex = selections[0].end.character;

  const luaCode = `return require("talon.cursorless").select_range(${
    selections[0].start.line + 1
  }, ${selections[0].start.character}, ${
    selections[0].end.line + 1
  }, ${endIndex})`;
  console.warn(
    `bufferSetSelections() selections=(${selections[0].start.line},${selections[0].start.character}),(${selections[0].end.line},${selections[0].end.character}) luaCode="${luaCode}"`,
  );
  await client.executeLua(luaCode, []);
  // console.warn(`bufferSetSelections() done`);
}

/**
 * Get the current "visible" ranges in the window(editor) (vertically).
 * This accounts only for vertical scrolling, and not for horizontal scrolling.
 * TODO: support any window as atm only supports the current window
 */
export async function windowGetVisibleRanges(
  window: Window,
  client: NeovimClient,
  lines: string[],
): Promise<Range[]> {
  // Get the first and last visible lines of the current window
  // Note they are indexed from 1, similarly to what is shown in neovim*
  const luaCode = `return require("talon.cursorless").window_get_visible_lines()`;
  const [firstLine, lastLine] = (await client.executeLua(
    luaCode,
    [],
  )) as Array<number>;
  // subtract 1 to the lines to get the correct 0-based line numbers
  return [
    new Range(
      new Position(firstLine - 1, 0),
      // subtract -1 to the line.length to get the correct 0-based column number
      new Position(lastLine - 1, lines[lastLine - 1].length - 1),
    ),
  ];
}

export async function putToClipboard(data: string, client: NeovimClient) {
  const luaCode = `return require("talon.cursorless").put_to_clipboard("${data}")`;
  await client.executeLua(luaCode, []);
}

// TODO: this hasn't been tested yet
export async function getFromClipboard(client: NeovimClient): Promise<string> {
  const luaCode = `return require("talon.cursorless").get_from_clipboard()`;
  const data = await client.executeLua(luaCode, []);
  return data as unknown as string;
}
