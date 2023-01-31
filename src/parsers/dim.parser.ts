import { addArray } from "../arrays";
import { writeBufferProgram } from "../buffer";
import { CMDS, ERRORS, SIZE, TYPES } from "../defs";
import { lexer, tokenizer } from "../lexer";
import {
	declareVar,
	findVar,
	getVarType,
	setVar,
	setVarDeclared,
	setVarType,
} from "../vars";
import { parseNum } from "./number.parser";

export function parserDim() {
	const varName = lexer();
	if (varName == null) return ERRORS.SYNTAX_ERROR;

	let varIdx = findVar(varName);
	if (varIdx < 0) {
		// varIdx= declareVar(varName, context.level, true);
		varIdx = declareVar(varName, 0, true);
	} else {
		const isArray = getVarType(varIdx) & TYPES.ARRAY;
		if (!isArray) return ERRORS.TYPE_MISMATCH;

		const isDeclared = !(getVarType(varIdx) & TYPES.UNDECLARED);
		if (isDeclared) return ERRORS.TYPE_MISMATCH;

		setVarDeclared(varIdx);
	}
	writeBufferProgram(SIZE.word, varIdx);

	if (lexer() !== "(") return ERRORS.SYNTAX_ERROR;

	const dim = parseNum();
	if (isNaN(dim)) return ERRORS.SYNTAX_ERROR;

	if (lexer() !== ")") return ERRORS.SYNTAX_ERROR;

	if (tokenizer(true) === CMDS.AS) {
		if ((getVarType(varIdx) & 0x3f) !== TYPES.int) return ERRORS.TYPE_MISMATCH;

		lexer();
		const size = tokenizer();
		switch (size) {
			case CMDS.BYTE: {
				setVarType(varIdx, TYPES.byte);
				break;
			}
			case CMDS.WORD: {
				break;
			}
			default:
				return ERRORS.SYNTAX_ERROR;
		}
	}

	const arrIdx = addArray(getVarType(varIdx) & 0x3f, dim);
	setVar(varIdx, arrIdx);

	return 0;
}
