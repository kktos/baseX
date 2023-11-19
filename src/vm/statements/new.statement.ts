import { ERRORS } from "../../defs";
import { initParser } from "../../parser";
import { context } from "../vm.def";

export function newStatement() {
	context.lineIdx = 0xffff;

	initParser();

	return ERRORS.NONE;
}
