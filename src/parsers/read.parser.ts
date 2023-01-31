import { writeBufferProgram } from "../buffer";
import { ERRORS, SIZE, TOKENS } from "../defs";
import { lexer, tokenizer } from "../lexer";
import { addVar, findVar } from "../vars";

export function parserRead() {

	while (true) {
		const varName = lexer();
		if (varName == null) return ERRORS.SYNTAX_ERROR;

		let varIdx = findVar(varName);
		if (varIdx < 0)
			varIdx = addVar(varName);

		writeBufferProgram(SIZE.word, varIdx);

		const tok = tokenizer();
		if(tok<0) {
			writeBufferProgram(SIZE.word, 0xFFFF);
			return 0;
		}

		if(tok!==TOKENS.COMMA)
			return ERRORS.SYNTAX_ERROR;

	};

}
