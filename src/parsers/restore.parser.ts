import { writeBufferProgram } from "../buffer";
import { ERRORS, SIZE, TOKEN_TYPES } from "../defs";
import { lexeme, lexer } from "../lexer";
import { parseIntNumber } from "./expr/constant.parser";

/*
	RESTORE
	RESTORE <line number>
 */
export function parserRestore() {
	const tok = lexer();

	if (tok.err === ERRORS.END_OF_LINE) {
		writeBufferProgram(SIZE.word, 0xffff);
		return ERRORS.NONE;
	}

	if (tok.err) return tok.err;

	if (tok.type !== TOKEN_TYPES.INT) return ERRORS.TYPE_MISMATCH;

	const linenum = parseIntNumber(lexeme);
	writeBufferProgram(SIZE.word, Number.isNaN(linenum) ? 0xffff : linenum);
	return ERRORS.NONE;
}
