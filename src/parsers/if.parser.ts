import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, prgCode, SIZE, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { lexer, tokenizer } from "../lexer";
import { parserGoto } from "./goto.parser";

export function parserIf() {
	const err = parseExpr();
	if (err) return err;

	if (tokenizer() !== CMDS.THEN) return ERRORS.SYNTAX_ERROR;

	writeBufferProgram(SIZE.byte, TYPES.END);

	writeBufferProgram(SIZE.byte, CMDS.GOTO);
	parserGoto();
	return 0;
}

export function parserEnd() {
	const cmd = tokenizer(true);
	switch (cmd) {
		case CMDS.FUNCTION: {
			lexer();
			prgCode.idx--;
			writeBufferProgram(SIZE.byte, CMDS.END_FUNCTION);
			break;
		}
	}
}
