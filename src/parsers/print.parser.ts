import { writeBufferProgram } from "../buffer";
import { SIZE, TOKENS, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { tokenizer } from "../lexer";

export function parserPrint() {
	let tok;
	let hasMore = false;
	do {
		const err = parseExpr();
		if (err) return err;
		writeBufferProgram(SIZE.byte, TYPES.END);

		tok = tokenizer();
		hasMore = false;
		switch (tok) {
			case TOKENS.COMMA:
				hasMore = true;
				writeBufferProgram(SIZE.byte, 0x09);
				break;
			case TOKENS.SEMICOLON:
				hasMore = true;
				writeBufferProgram(SIZE.byte, 0x0a);
				break;
			default:
				writeBufferProgram(SIZE.byte, TYPES.END);
		}
	} while (hasMore);

	return 0;
}
