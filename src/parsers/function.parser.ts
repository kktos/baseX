import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, prgCode, SIZE, TOKENS, TYPES } from "../defs";
import { parseExpr } from "../expr";
import { lexer, tokenizer } from "../lexer";
import { addString } from "../strings";
import {
	findVar,
	getTypeFromName,
	isVarDeclared,
	setVar,
	setVarDeclared,
	setVarFunction,
} from "../vars";

export function parserFunction(lineIdx: number) {
	let name = lexer();
	if (name == null) return ERRORS.SYNTAX_ERROR;

	const varIdx = findVar(name);
	if (varIdx >= 0) {
		if (isVarDeclared(varIdx)) return ERRORS.DUPLICATE_NAME;

		setVarDeclared(varIdx);
		setVarFunction(varIdx);
		setVar(varIdx, lineIdx);

		writeBufferProgram(SIZE.word, varIdx);

		const parmCountPos = prgCode.idx;
		writeBufferProgram(SIZE.byte, 0);

		if (tokenizer(true) === TOKENS.LEFT_PARENT) {
			let done = false;
			let parmCount = 0;
			while (!done) {
				lexer();

				if (tokenizer() !== TOKENS.DOLLAR) return ERRORS.SYNTAX_ERROR;

				name = lexer();
				if (name == null) return ERRORS.SYNTAX_ERROR;

				const nameIdx = addString(name, true);
				writeBufferProgram(SIZE.word, nameIdx);
				parmCount++;

				let varType = getTypeFromName(name);
				let tok = tokenizer(true);
				if (tok === CMDS.AS || tok === TOKENS.COLON) {
					lexer();
					tok = tokenizer();
					switch (tok) {
						case CMDS.INT:
						case CMDS.WORD:
							varType = TYPES.int;
							break;
						case CMDS.BYTE:
							varType = TYPES.byte;
							break;
						case CMDS.STRING:
							varType = TYPES.string;
							break;
						case CMDS.FLOAT:
							varType = TYPES.float;
							break;
						default:
							return ERRORS.SYNTAX_ERROR;
					}
					tok = tokenizer(true);
				}
				writeBufferProgram(SIZE.byte, varType);

				switch (tok) {
					case TOKENS.COMMA:
					case TOKENS.RIGHT_PARENT:
						done = true;
						break;
				}
			}
			lexer();
			prgCode.buffer[parmCountPos] = parmCount;
		}
		//return ERRORS.SYNTAX_ERROR;
	} else throw new Error("NOT YET IMPLEMENTED !");

	return 0;
}

export function parserReturn() {
	const err = parseExpr();
	if (err) return err;
	writeBufferProgram(SIZE.byte, TYPES.END);
	return 0;
}
