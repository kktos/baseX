import { computeItemIdx, getArrayItem } from "../arrays";
import { readBuffer } from "../buffer";
import { ERRORS, FNS, OPERATORS, SIZE, TYPES } from "../defs";
import { concatStrings, newString } from "../strings";
import { getVar } from "../vars";
import { varptr } from "./functions/varptr.function";
import { context, execStatements } from "./vm";
import { program } from "./vm.def";

export function execFn(fnIdx: number) {
	switch (fnIdx) {
		case OPERATORS.ADD: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;

			const result = { type: 0, value: 0 };
			// concat strings
			if (op1.type === TYPES.string) {
				if (op2.type !== TYPES.string) return ERRORS.TYPE_MISMATCH;
				result.type = TYPES.string;
				result.value = concatStrings(op2.value, op1.value);
			} else {
				result.type = op1.type;
				result.value = op1.value + op2.value;
			}

			context.exprStack.push(result);
			break;
		}
		case OPERATORS.SUB: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;
			context.exprStack.push({ type: op1.type, value: op2.value - op1.value });
			break;
		}
		case OPERATORS.MULT: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;
			context.exprStack.push({ type: op1.type, value: op1.value * op2.value });
			break;
		}
		case OPERATORS.GT: {
			const op1 = context.exprStack.pop();
			const op2 = context.exprStack.pop();
			if (!(op1 && op2)) return ERRORS.TYPE_MISMATCH;
			context.exprStack.push({
				type: op1.type,
				value: op2.value > op1.value ? 1 : 0,
			});
			break;
		}
		case FNS.CHR$: {
			const op1 = context.exprStack.pop();
			if (!op1 || op1.type !== TYPES.int) return ERRORS.TYPE_MISMATCH;
			op1.type = TYPES.string;
			op1.value = newString(String.fromCharCode(op1.value));
			context.exprStack.push(op1);
			break;
		}
		case FNS.HEX$: {
			const op1 = context.exprStack.pop();
			// only int allowed
			if (!op1 || op1.type !== TYPES.int) return ERRORS.TYPE_MISMATCH;
			// only one parm allowed
			// if(context.exprStack.length) return ERRORS.SYNTAX_ERROR;
			context.exprStack.push({ type: TYPES.string, value: newString(op1.value.toString(16)) });
			break;
		}
		case FNS.VARPTR: {
			const err= varptr(context);
			if(err) return err;
			break;
		}
		case FNS.GET_ITEM: {
			const arr = context.exprStack.pop();
			if (!arr) return ERRORS.TYPE_MISMATCH;

			const dims: number[] = [];

			while (context.exprStack.length) {
				const op1 = context.exprStack.pop();
				if (!op1 || op1.type !== TYPES.int) return ERRORS.TYPE_MISMATCH;
				dims.unshift(op1.value);
			}

			const offset = computeItemIdx(arr.value, dims);
			if (offset < 0) return ERRORS.OUT_OF_BOUNDS;
			arr.value = getArrayItem(arr.type, arr.value, offset);
			context.exprStack.push(arr);
			break;
		}
		case FNS.USER_DEF: {
			const varIdx = readBuffer(program, SIZE.word);

			// const op1= context.exprStack.pop();

			const lineIdx = context.lineIdx;
			const prgIdx = program.idx;

			context.level++;
			context.lineIdx = getVar(varIdx);

			const err = execStatements();
			if (err) return err;

			if (!context.returnExpr) return ERRORS.TYPE_MISMATCH;

			context.level--;
			program.idx = prgIdx;
			context.lineIdx = lineIdx;

			context.exprStack.push(context.returnExpr);

			break;
		}
		default:
			return ERRORS.UNKNOWN_FUNCTION;
	}

	return 0;
}
