import { writeBufferProgram } from "../buffer";
import { ERRORS, SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { advance, lexeme, lexer } from "../lexer";
import { newString } from "../strings";

export function parserData(): ERRORS {
	while (true) {
		const err = parseItem();
		if (err) return err;
		writeBufferProgram(SIZE.byte, TYPES.END);

		const tok = lexer();
		if (tok.err) {
			if (tok.err === ERRORS.END_OF_LINE) {
				writeBufferProgram(SIZE.word, TYPES.END);
				return ERRORS.NONE;
			}
			return tok.err;
		}

		if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.COMMA) return ERRORS.SYNTAX_ERROR;
	}
}

function parseItem(): ERRORS {
	const tok = lexer(true);
	if (tok.err) return tok.err;

	switch (tok.type) {
		case TOKEN_TYPES.INT: {
			advance();
			const num = parseInt(lexeme);
			writeBufferProgram(SIZE.byte, TYPES.int);
			writeBufferProgram(SIZE.word, num);
			return ERRORS.NONE;
		}

		case TOKEN_TYPES.FLOAT: {
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

		case TOKEN_TYPES.STRING: {
			advance();
			writeBufferProgram(SIZE.byte, TYPES.string);
			const idx = newString(lexeme.slice(1));
			writeBufferProgram(SIZE.word, idx);
			return ERRORS.NONE;
		}
	}

	return ERRORS.TYPE_MISMATCH;
}
