import { computeItemIdx, setArrayItem } from "../../arrays";
import { readBufferProgram } from "../../buffer";
import { ERRORS, SIZE, TYPES, VAR_FLAGS } from "../../defs";
import { copyString, createString } from "../../strings";
import { getVar, getVarType, isVarDeclared, setVar, setVarDeclared } from "../../vars";
import { evalExpr, expr } from "../expr.vm";

export function assignVar(excluded: number[] = []): ERRORS {
	const varIdx = readBufferProgram(SIZE.word);
	const err = evalExpr();
	if (err) return err;

	if (excluded.includes(expr.type)) return ERRORS.TYPE_MISMATCH;

	const varType = getVarType(varIdx);

	if (varType !== (expr.type & VAR_FLAGS.TYPE)) return ERRORS.TYPE_MISMATCH;

	if (varType === TYPES.string) {
		let destStrIdx = getVar(varIdx);

		if (destStrIdx === 0xffff) {
			destStrIdx = createString(255);
			setVar(varIdx, destStrIdx);
		}

		const err = copyString(destStrIdx, expr.value);
		if (err) return err;
	} else {
		setVar(varIdx, expr.value);
	}

	setVarDeclared(varIdx);

	return ERRORS.NONE;
}

export function assignArrayItem(): ERRORS {
	const varIdx = readBufferProgram(SIZE.word);

	if (!isVarDeclared(varIdx)) return ERRORS.UNDECLARED_VARIABLE;

	const dimsCount = readBufferProgram(SIZE.byte);
	const dims = [];
	let err;

	for (let idx = 0; idx < dimsCount; idx++) {
		err = evalExpr();
		if (err) return err;

		if (expr.type !== TYPES.int) return ERRORS.TYPE_MISMATCH;

		dims.push(expr.value);
	}

	err = evalExpr();
	if (err) return err;

	const arrayIdx = getVar(varIdx);
	const offset = computeItemIdx(arrayIdx, dims);
	if (offset < 0) return ERRORS.OUT_OF_BOUNDS;
	err = setArrayItem(getVarType(varIdx), arrayIdx, offset, expr.value);
	if (err) return err;

	return ERRORS.NONE;
}
