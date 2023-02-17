import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, prgCode, SIZE, TYPES } from "../defs";
import { isCommand, isLookaheadCommand, lexer } from "../lexer";
import { parseExpr } from "./expr.parser";
import { parserGoto } from "./goto.parser";

export function parserIf() {
	const err = parseExpr();
	if (err) return err;

	if (!isCommand(CMDS.THEN)) return ERRORS.SYNTAX_ERROR;

	writeBufferProgram(SIZE.byte, TYPES.END);

	writeBufferProgram(SIZE.byte, CMDS.GOTO);
	parserGoto();
	return 0;
}

export function parserEnd() {
	if (!isLookaheadCommand(CMDS.FUNCTION)) return;

	lexer();
	prgCode.idx--;
	writeBufferProgram(SIZE.byte, CMDS.END_FUNCTION);
}
