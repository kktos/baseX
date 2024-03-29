import { writeBufferProgram } from "../../buffer";
import { ERRORS, SIZE, TYPES } from "../../defs";
import { advance, lexeme } from "../../lexer";
import { STRING_TYPE, newString } from "../../strings";

export function compileInteger() {
	advance();
	const num = parseIntNumber(lexeme);
	writeBufferProgram(SIZE.byte, TYPES.int);
	writeBufferProgram(SIZE.word, num);
	return ERRORS.NONE;
}

export function compileFloat() {
	advance();
	const num = parseFloat(lexeme);
	const buffer = new Uint8Array(4);
	const view = new DataView(buffer.buffer);
	view.setFloat32(0, num);
	writeBufferProgram(SIZE.byte, TYPES.float);
	for (let idx = 0; idx < 4; idx++) {
		writeBufferProgram(SIZE.byte, view.getUint8(idx));
	}
	return ERRORS.NONE;
}

export function compileString() {
	advance();
	writeBufferProgram(SIZE.byte, TYPES.string);
	const idx = newString(lexeme.slice(1), STRING_TYPE.CONSTANT);
	writeBufferProgram(SIZE.word, idx);
	return ERRORS.NONE;
}

export function parseIntNumber(str: string) {
	return parseInt(str.replace("$", "0x").replace("%", "0b"));
}
