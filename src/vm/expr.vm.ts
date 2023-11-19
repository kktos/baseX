import { readBufferProgram } from "../buffer";
import { ERRORS, SIZE, TYPES } from "../defs";
import { getString } from "../strings";
import { findVar, getVar, getVarType } from "../vars";
import { execFn } from "./fn.vm";
import { TExpr, context } from "./vm.def";

export let expr: TExpr = {
	type: 0,
	value: 0,
};

export function evalExpr(): ERRORS {
	function getVarValue(varIdx: number) {
		expr.type = getVarType(varIdx); // & 0x3F;
		expr.varIdx = varIdx | 0x8000;

		expr.value = getVar(varIdx);

		// if(isVarArray(varIdx)) return;
		// switch (expr.type) {
		// 	case TYPES.int: {
		// 		expr.value = getVar(varIdx);
		// 		break;
		// 	}
		// 	case TYPES.float: {
		// 		expr.value = getVar(varIdx);
		// 		break;
		// 	}
		// 	case TYPES.string: {
		// 		expr.value = getVar(varIdx);
		// 		break;
		// 	}
		// 	default: {
		// 		expr.value = getVar(varIdx);
		// 		break;
		// 	}
		// }
	}

	while (true) {
		const itemType = readBufferProgram(SIZE.byte); //readBuffer(program, SIZE.byte);
		if (itemType === TYPES.END) break;

		switch (itemType) {
			case TYPES.local: {
				const nameIdx = readBufferProgram(SIZE.word);
				const varIdx = findVar(getString(nameIdx), context.level);
				if (varIdx < 0) return ERRORS.UNKNOWN_VARIABLE;
				getVarValue(varIdx);
				break;
			}

			case TYPES.var: {
				const varIdx = readBufferProgram(SIZE.word);
				getVarValue(varIdx);
				break;
			}

			case TYPES.string: {
				const strIdx = readBufferProgram(SIZE.word);
				expr.type = TYPES.string;
				expr.value = strIdx;
				break;
			}

			case TYPES.int: {
				const num = readBufferProgram(SIZE.word);
				expr.type = TYPES.int;
				expr.value = num;
				break;
			}

			case TYPES.float: {
				const buffer = new Uint8Array(4);
				const view = new DataView(buffer.buffer);
				for (let idx = 0; idx < 4; idx++) {
					view.setUint8(idx, readBufferProgram(SIZE.byte));
				}
				expr.type = TYPES.float;
				expr.value = view.getFloat32(0);
				break;
			}

			case TYPES.fn: {
				const fnIdx = readBufferProgram(SIZE.byte);
				const err = execFn(fnIdx);
				if (err) return err;
				continue;
			}
		}
		context.exprStack.push({ ...expr });

		// console.log("-----", hexWord(program.idx), context.exprStack);
	}

	if (context.exprStack.length) {
		const e = context.exprStack.pop();
		if (e) expr = e;
	}

	if (context.exprStack.length) return ERRORS.SYNTAX_ERROR;

	return ERRORS.NONE;
}
