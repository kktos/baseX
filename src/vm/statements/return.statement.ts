import { ERRORS } from "../../defs";
import { removeVarsForLevel } from "../../vars";
import { evalExpr, expr } from "../expr.vm";
import { context } from "../vm.def";

export function returnStatement() {
	// return only from a function (level>0)
	if (!context.level) return ERRORS.ILLEGAL_STATEMENT;

	const err = evalExpr();
	if (err) return err;

	context.returnExpr = expr;

	removeVarsForLevel(context.level);

	return ERRORS.NONE;
}
