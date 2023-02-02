import { readBufferHeader, writeBufferHeader, writeBufferLine } from "./buffer";
import { HEADER, prgLines } from "./defs";

export function addPrgLine(lineNum: number, offset: number) {
	let lineIdx = findPrgLine(lineNum);
	if (lineIdx >= 0) {
		prgLines.buffer[lineIdx + 2] = offset & 0xff;
		prgLines.buffer[lineIdx + 3] = (offset >> 8) & 0xff;
		return lineIdx;
	}

	// console.log("addPrgLine", lineNum, hexWord(offset));

	const currLineIdx = prgLines.idx;

	let min = 0;
	let minIdx = -1;
	for (let idx = 0; idx < currLineIdx; idx += 6) {
		const currLineNum = prgLines.buffer[idx] | (prgLines.buffer[idx + 1] << 8);
		if (currLineNum < lineNum && currLineNum > min) {
			min = currLineNum;
			minIdx = idx;
		}
	}

	let nextLineIdx = 0xffff;

	if (minIdx === -1) {
		nextLineIdx = readBufferHeader(HEADER.START);
		writeBufferHeader(HEADER.START, currLineIdx);
		// console.log("addPrgLine start", hexWord(nextLineIdx));
	} else {
		nextLineIdx = prgLines.buffer[minIdx + 4] | (prgLines.buffer[minIdx + 5] << 8);
		writeBufferLine(currLineIdx, minIdx + 4);
		// console.log("addPrgLine prev", min, hexWord(minIdx));
	}

	lineIdx = prgLines.idx;
	writeBufferLine(lineNum);
	writeBufferLine(offset);
	writeBufferLine(nextLineIdx);

	// console.log(hexdump(prgLines.buffer, 0, prgLines.idx, 6));
	return lineIdx;
}

export function findPrgLine(lineNum: number) {
	for (let idx = 0; idx < prgLines.idx; idx += 6) {
		const currLineNum = prgLines.buffer[idx] | (prgLines.buffer[idx + 1] << 8);
		if (currLineNum === lineNum) return idx;
	}
	return -1;
}
