import { writeBufferProgram } from "../buffer";
import { SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { lexer } from "../lexer";
import { parseExpr } from "./expr.parser";

export function parserPrint() {
	let tok;
	let sep = TYPES.END;
	do {
		const err = parseExpr();
		if (err) return err;
		writeBufferProgram(SIZE.byte, TYPES.END);

		tok = lexer();
		if (tok.type === TOKEN_TYPES.OPERATOR) {
			switch (tok.value) {
				case TOKENS.COMMA:
					sep = 0x09;
					break;
				case TOKENS.SEMICOLON:
					sep = 0x0a;
					break;
			}
		}

		writeBufferProgram(SIZE.byte, sep);
	} while (sep !== TYPES.END);

	return 0;
}
