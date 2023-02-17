import { getArrayDataPtr } from "../../arrays";
import { ERRORS, TYPES, VAR_FLAGS } from "../../defs";
import { getVarFlags, getVarValueAddr } from "../../vars";
import { TContext } from "../vm.def";

export function varptr(context: TContext) {
	const op1 = context.exprStack.pop();
	// only int allowed
	if (!op1?.varIdx) return ERRORS.TYPE_MISMATCH;
	const varIdx= op1.varIdx & 0x7FFF;
	// const type= getVarType(varIdx);
	const flags= getVarFlags(varIdx);

	let addr;
	if(flags & VAR_FLAGS.ARRAY) {
		addr= getArrayDataPtr(op1.value);
	} else {
		addr= getVarValueAddr(varIdx);
	}

	context.exprStack.push({ type: TYPES.int, value: addr });

	// context.exprStack.push({
	// 	type: TYPES.string,
	// 	value: newString(`${hexWord(varIdx)}:${hexWord(addr)} ${hexByte(type)} ${hexByte(flags)}`),
	// });

	return ERRORS.NONE;
}
