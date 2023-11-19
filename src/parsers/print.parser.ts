import { writeBufferProgram } from "../buffer";
import { ERRORS, SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { lexer } from "../lexer";
import { parseExpr } from "./expr.parser";

export function parserPrint() {
	let tok;
	let sep = TYPES.END;
	while (true) {
		const err = parseExpr();
		if (err) return err;
		writeBufferProgram(SIZE.byte, TYPES.END);

		// check lookahead
		tok = lexer(true);
		// nothing else -> exit
		if (tok.err === ERRORS.END_OF_LINE) break;
		// err -> exit
		if (tok.err) return tok.err;
		// not an operator -> end of print -> exit
		if (tok.type !== TOKEN_TYPES.OPERATOR) break;
		// : -> end of print -> exit
		if (tok.value === TOKENS.COLON) break;

		switch (tok.value) {
			case TOKENS.COMMA:
				sep = 0x09;
				break;
			case TOKENS.SEMICOLON:
				sep = 0x0a;
				break;
		}
		tok = lexer();

		writeBufferProgram(SIZE.byte, sep);
	}

	writeBufferProgram(SIZE.byte, TYPES.END);

	return 0;
}
