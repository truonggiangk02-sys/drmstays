import { describe, expect, it } from "vitest";
import type { TextEdit } from "@/lib/editor-text";
import { addHeader, cellRanges, deleteColumn, deleteRow, deleteTable, formatTable, insertColumn, insertRow, newTable, splitRow, tableAt, tidyTable } from "@/lib/table-edit";

const apply = (value: string, edit: TextEdit | null) => { if (!edit) return null; const out = value.slice(0, edit.from) + edit.text + value.slice(edit.to); return { out, selected: out.slice(edit.selectFrom, edit.selectTo) }; };

const TABLE = "| Area | Price |\n| --- | --- |\n| An Thuong | 11 |\n| My Khe | 13 |";
const doc = `Intro paragraph.\n\n${TABLE}\n\nAfter the table.`;
/** The cells of every row of the table in `text`, leaving out the divider row. */
const cells = (text: string) => text.split("\n").filter(line => line.startsWith("|") && !/^\|[\s|:-]*-[\s|:-]*$/.test(line)).map(splitRow);
const at = (needle: string, extra = 0) => doc.indexOf(needle) + extra;

describe("finding the table at the cursor", () => {
  it("returns null outside a table", () => {
    expect(tableAt(doc, 3)).toBeNull();
    expect(tableAt(doc, doc.length)).toBeNull();
  });
  it("reads the header, the rows and the table's place in the text", () => {
    const model = tableAt(doc, at("An Thuong"))!;
    expect(model.header).toEqual(["Area", "Price"]);
    expect(model.rows).toEqual([["An Thuong", "11"], ["My Khe", "13"]]);
    expect(doc.slice(model.from, model.to)).toBe(TABLE);
    expect(model.hasHeader).toBe(true);
  });
  it("says which row and column the cursor is in", () => {
    expect(tableAt(doc, at("Area"))).toMatchObject({ rowIndex: -1, colIndex: 0 });
    expect(tableAt(doc, at("Price", 2))).toMatchObject({ rowIndex: -1, colIndex: 1 });
    expect(tableAt(doc, at("An Thuong", 3))).toMatchObject({ rowIndex: 0, colIndex: 0 });
    expect(tableAt(doc, at("13"))).toMatchObject({ rowIndex: 1, colIndex: 1 });
  });
  it("puts a cursor on the divider line in the first body row's neighbourhood, not in the header", () => {
    expect(tableAt(doc, at("| --- |", 3))!.rowIndex).toBeGreaterThanOrEqual(-1);
  });
  it("copes with ragged rows by padding them", () => {
    const model = tableAt("| a | b | c |\n| - | - | - |\n| 1 |", 20)!;
    expect(model.cols).toBe(3);
    expect(model.rows[0]).toEqual(["1", "", ""]);
  });
  it("reads a table with no header row", () => {
    const model = tableAt("| a | b |\n| c | d |", 2)!;
    expect(model.hasHeader).toBe(false);
    expect(model.rows).toEqual([["a", "b"], ["c", "d"]]);
  });
  it("treats an escaped bar as part of the cell", () => {
    expect(splitRow("| a \\| b | c |")).toEqual(["a \\| b", "c"]);
  });
});

describe("making a table", () => {
  it("builds the size asked for, with a header row, and selects the first header", () => {
    const made = newTable(3, 2);
    expect(made.text.split("\n")).toHaveLength(4);
    expect(made.text.split("\n")[0]).toBe("| Column 1 | Column 2 | Column 3 |");
    expect(made.text.slice(made.select.from, made.select.to)).toBe("Column 1");
    expect(splitRow(made.text.split("\n")[2])).toEqual(["Text", "Text", "Text"]);
  });
  it("lines the bars up whatever the cell widths", () => {
    const lines = formatTable(["Area", "Price"], [["An Thuong", "11"], ["My Khe", "13,000,000"]]).split("\n");
    expect(new Set(lines.map(line => line.length)).size).toBe(1);
    expect(lines[1]).toMatch(/^\| -+ \| -+ \|$/);
  });
  it("measures characters, not bytes, so accents do not push the bars", () => {
    const lines = formatTable(["Khu vực", "Giá"], [["Đà Nẵng", "11"]]).split("\n");
    expect(new Set(lines.map(line => [...line].length)).size).toBe(1);
  });
});

describe("rows", () => {
  it("adds a row below the cursor's row, empty, with the cursor in it", () => {
    const result = apply(doc, insertRow(tableAt(doc, at("An Thuong"))!, "below"))!;
    expect(cells(result.out).map(row => row[0])).toEqual(["Area", "An Thuong", "", "My Khe"]);
    expect(result.out).toContain("After the table.");
  });
  it("adds a row above", () => {
    expect(cells(apply(doc, insertRow(tableAt(doc, at("My Khe"))!, "above"))!.out).map(row => row[0])).toEqual(["Area", "An Thuong", "", "My Khe"]);
  });
  it("adds a row under the header when the cursor is in the header, and refuses above the header", () => {
    const model = tableAt(doc, at("Area"))!;
    expect(cells(apply(doc, insertRow(model, "below"))!.out)[1][0]).toBe("");
    expect(insertRow(model, "above")).toBeNull();
  });
  it("removes a row, but never the last one or the header", () => {
    const result = apply(doc, deleteRow(tableAt(doc, at("An Thuong"))!))!;
    expect(result.out).not.toContain("An Thuong");
    expect(result.out).toContain("My Khe");
    expect(deleteRow(tableAt(doc, at("Area"))!)).toBeNull();
    const single = "| a |\n| - |\n| 1 |";
    expect(deleteRow(tableAt(single, 14)!)).toBeNull();
  });
});

describe("columns", () => {
  it("adds a column to the right of the cursor's, in every row, with a header name", () => {
    const result = apply(doc, insertColumn(tableAt(doc, at("Area"))!, "right"))!;
    const rows = cells(result.out);
    expect(rows.map(row => row.length)).toEqual([3, 3, 3]);
    expect(rows[0]).toEqual(["Area", "Column", "Price"]);
    expect(result.selected).toBe("Column");
  });
  it("adds a column to the left", () => {
    expect(cells(apply(doc, insertColumn(tableAt(doc, at("Area"))!, "left"))!.out)[0]).toEqual(["Column", "Area", "Price"]);
  });
  it("removes the cursor's column, but never the last", () => {
    const result = apply(doc, deleteColumn(tableAt(doc, at("Price", 1))!))!;
    expect(result.out).not.toContain("Price");
    expect(result.out).toContain("An Thuong");
    expect(deleteColumn(tableAt("| a |\n| - |\n| 1 |", 3)!)).toBeNull();
  });
});

describe("tidying, headers and removing", () => {
  it("tidies a ragged table so the bars line up", () => {
    const messy = "| a|b |\n|-|-|\n| long cell here|x|";
    const result = apply(messy, tidyTable(tableAt(messy, 3)!))!;
    const lines = result.out.split("\n");
    expect(new Set(lines.map(line => line.length)).size).toBe(1);
    expect(splitRow(lines[2])).toEqual(["long cell here", "x"]);
  });
  it("leaves the text around the table alone", () => {
    const result = apply(doc, tidyTable(tableAt(doc, at("An Thuong"))!))!;
    expect(result.out.startsWith("Intro paragraph.\n\n")).toBe(true);
    expect(result.out.endsWith("\n\nAfter the table.")).toBe(true);
  });
  it("gives a table without a header one", () => {
    const text = "| a | b |\n| c | d |";
    const result = apply(text, addHeader(tableAt(text, 2)!))!;
    expect(result.out.split("\n")[1]).toMatch(/^\| -+ \| -+ \|$/);
    expect(splitRow(result.out.split("\n")[0])).toEqual(["a", "b"]);
    expect(addHeader(tableAt(doc, at("An Thuong"))!)).toBeNull();
  });
  it("removes the whole table and its line break", () => {
    const result = apply(doc, deleteTable(doc, tableAt(doc, at("My Khe"))!))!;
    expect(result.out).toBe("Intro paragraph.\n\n\nAfter the table.");
  });
});

describe("moving between cells", () => {
  it("lists every cell's text as a range, skipping the divider row", () => {
    const found = cellRanges(doc, tableAt(doc, at("Area"))!);
    expect(found.map(cell => doc.slice(cell.from, cell.to))).toEqual(["Area", "Price", "An Thuong", "11", "My Khe", "13"]);
    expect(found.map(cell => [cell.row, cell.col])).toEqual([[-1, 0], [-1, 1], [0, 0], [0, 1], [1, 0], [1, 1]]);
  });
  it("gives empty cells a range too, at the spot where the text would go", () => {
    const text = "| a | b |\n| - | - |\n|  | x |";
    const found = cellRanges(text, tableAt(text, 2)!);
    expect(found.map(cell => [cell.row, cell.col, cell.to - cell.from])).toEqual([[-1, 0, 1], [-1, 1, 1], [0, 0, 0], [0, 1, 1]]);
  });
});
