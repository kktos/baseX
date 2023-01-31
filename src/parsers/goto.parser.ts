import { writeBufferProgram } from "../buffer";
import { SIZE } from "../defs";
import { addPrgLine, findPrgLine } from "../prglines";
import { parseNum } from "./number.parser";

export function parserGoto() {
	const linenum = parseNum();
	let lineIdx = findPrgLine(linenum);
	if (lineIdx < 0) lineIdx = addPrgLine(linenum, 0xffff);
	writeBufferProgram(SIZE.word, lineIdx);
}
