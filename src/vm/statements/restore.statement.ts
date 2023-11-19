import { readBufferProgram } from "../../buffer";
import { ERRORS, SIZE } from "../../defs";
import { findPrgLine } from "../../prglines";
import { findDataVar, resetDataLine } from "./read.statement";

export function restoreStatement() {
	const dataLinesArrayID = findDataVar();
	if (dataLinesArrayID === -1) return ERRORS.OUT_OF_DATA;

	const lineNum = readBufferProgram(SIZE.word);

	if (lineNum === 0xffff) {
		const err = resetDataLine();
		if (err) return err;
	} else {
		const lineIdx = findPrgLine(lineNum);
		if (lineIdx < 0) return ERRORS.LINE_MISSING;
	}

	return ERRORS.NONE;
}
