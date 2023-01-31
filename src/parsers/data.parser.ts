import { writeBufferProgram } from "../buffer";
import { ERRORS, SIZE, TOKENS, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { tokenizer } from "../lexer";

export function parserData() {
	while (true) {
		const err = parseExpr();
		if (err) return err;
		writeBufferProgram(SIZE.byte, TYPES.END);

		const tok = tokenizer();
		if(tok<0) {
			writeBufferProgram(SIZE.byte, TYPES.END);
			return 0;
		}

		if(tok!==TOKENS.COMMA)
			return ERRORS.SYNTAX_ERROR;
	};

}
