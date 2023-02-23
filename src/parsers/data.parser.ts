import { addArray, getArrayItem, setArrayItem } from "../arrays";
import { writeBufferProgram } from "../buffer";
import { DATA, DATA_FIELDS, ERRORS, SIZE, TOKENS, TOKEN_TYPES, TYPES } from "../defs";
import { lexer } from "../lexer";
import { currentLineIdx } from "../parser";
import { declareArray, findVar, getVar, setVar } from "../vars";
import { compileFloat, compileInteger, compileString } from "./expr/constant.parser";

export function parserData(): ERRORS {
	while (true) {
		const err = parseItem();
		if (err) return err;

		const tok = lexer();
		if (tok.err) {
			if (tok.err === ERRORS.END_OF_LINE) {
				writeBufferProgram(SIZE.byte, TYPES.END);
				break;
			}
			return tok.err;
		}

		if (tok.type !== TOKEN_TYPES.OPERATOR || tok.value !== TOKENS.COMMA) return ERRORS.SYNTAX_ERROR;
	}

	let arrIdx: number;
	let dataIdx= findVar(DATA);
	if (dataIdx < 0) {
		dataIdx = declareArray(DATA);
		arrIdx = addArray(TYPES.int, [14]);
		setVar(dataIdx, arrIdx);
		// count= 0
		setArrayItem(TYPES.int, arrIdx, DATA_FIELDS.COUNT, 0);
		// curPtr= 0
		setArrayItem(TYPES.int, arrIdx, DATA_FIELDS.PTR, 0xFFFF);
	} else {
		arrIdx= getVar(dataIdx);
	}

	// console.log("DATA",currentLineNum);

	const count= getArrayItem(TYPES.int, arrIdx, DATA_FIELDS.COUNT);
	setArrayItem(TYPES.int, arrIdx, DATA_FIELDS.COUNT, count+1);

	setArrayItem(TYPES.int, arrIdx, DATA_FIELDS.ITEMS+count, currentLineIdx);

	// console.log(hexWord(currentLineIdx), currentLineNum, count);

	return ERRORS.NONE;
}

function parseItem(): ERRORS {
	const tok = lexer(true);
	if (tok.err) return tok.err;

	const compilers: Record<number, ()=>ERRORS>= {
		[TOKEN_TYPES.INT]: compileInteger,
		[TOKEN_TYPES.FLOAT]: compileFloat,
		[TOKEN_TYPES.STRING]: compileString,
	};

	if(!compilers.hasOwnProperty(tok.type))
		return ERRORS.TYPE_MISMATCH;

	return compilers[tok.type]();

}
