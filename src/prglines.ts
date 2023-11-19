import { readBufferHeader, readBufferLine, writeBufferHeader, writeBufferLine } from "./buffer";
import { HEADER, TPrint, prgLines } from "./defs";
import { hexWord } from "./utils";

const FIELDS = {
	LINENUM: 0,
	CODEPTR: 2,
	NEXTLINEPTR: 4,
};

export function addPrgLine(lineNum: number, codeAddr: number) {
	let lineIdx = findPrgLine(lineNum);

	// if line already exists, replace it with the new one
	if (lineIdx >= 0) {
		setLineCodePtr(lineIdx, codeAddr);
		return lineIdx;
	}

	const currLineIdx = prgLines.idx;

	// check if there is a line with the highest line number below the new one
	let min = 0;
	let minIdx = -1;
	for (let idx = 0; idx < currLineIdx; idx += 6) {
		const currLineNum = prgLines.buffer[idx + FIELDS.LINENUM] | (prgLines.buffer[idx + FIELDS.LINENUM + 1] << 8);
		if (currLineNum && currLineNum < lineNum && currLineNum >= min) {
			min = currLineNum;
			minIdx = idx;
		}
	}

	let nextLineIdx = 0xffff;

	if (minIdx === -1) {
		// no line number before so the new one is the new start
		// and the old start will be the next line

		nextLineIdx = readBufferHeader(HEADER.START);
		writeBufferHeader(HEADER.START, currLineIdx);
	} else {
		// take the nextLine from the min and it will be the nextLine of the new one

		nextLineIdx = prgLines.buffer[minIdx + FIELDS.NEXTLINEPTR] | (prgLines.buffer[minIdx + FIELDS.NEXTLINEPTR + 1] << 8);
		writeBufferLine(currLineIdx, minIdx + 4);
	}

	lineIdx = prgLines.idx;
	writeBufferLine(lineNum);
	writeBufferLine(codeAddr);
	writeBufferLine(nextLineIdx);

	return lineIdx;
}

export function setLineCodePtr(lineIdx: number, codeAddr: number) {
	prgLines.buffer[lineIdx + FIELDS.CODEPTR] = codeAddr & 0xff;
	prgLines.buffer[lineIdx + FIELDS.CODEPTR + 1] = (codeAddr >> 8) & 0xff;
}

export function addPrgStatement(lineIdx: number, codeAddr: number) {
	const currLineIdx = prgLines.idx;
	const nextLineIdx = readBufferLine(lineIdx + 4);
	const lineNum = readBufferLine(lineIdx);
	writeBufferLine(currLineIdx, lineIdx + 4);
	writeBufferLine(lineNum);
	writeBufferLine(codeAddr);
	writeBufferLine(nextLineIdx);

	return currLineIdx;
}

export function findPrgLine(lineNum: number) {
	for (let idx = 0; idx < prgLines.idx; idx += 6) {
		const currLineNum = prgLines.buffer[idx] | (prgLines.buffer[idx + 1] << 8);
		if (currLineNum === lineNum) return idx;
	}
	return -1;
}

export function getCodePtr(lineIdx: number) {
	const codePtr = lineIdx + FIELDS.CODEPTR;

	if (codePtr >= prgLines.idx) return -1;

	return prgLines.buffer[codePtr] | (prgLines.buffer[codePtr + 1] << 8);
}

export function dumpLines(out: TPrint) {
	let lineCursor = 0;

	out("----------- LINES\n");

	while (lineCursor < prgLines.idx) {
		out(`${hexWord(lineCursor)} : `);

		out(`lineNum= ${hexWord(readBufferLine(lineCursor))} `);
		lineCursor += 2;

		out(`codePtr= ${hexWord(readBufferLine(lineCursor))} `);
		lineCursor += 2;

		out(`nextLinePtr= ${hexWord(readBufferLine(lineCursor))} `);
		lineCursor += 2;

		out("\n");
	}
	out("\n");
}
