import { peekBufferProgram, readBufferProgram } from "../../buffer";
import { ERRORS, SIZE, TYPES } from "../../defs";
import { getString } from "../../strings";
import { evalExpr, expr } from "../expr.vm";

export function printStatement() {
	let sep;

	while (sep !== TYPES.END) {
		let outStr = "";
		const err = evalExpr();
		if (err) return err;

		switch (expr.type) {
			case TYPES.string: {
				outStr += getString(expr.value);
				break;
			}
			case TYPES.byte:
			case TYPES.int: {
				outStr += expr.value;
				break;
			}
			case TYPES.float: {
				outStr += expr.value;
				break;
			}
		}

		term(outStr);

		sep = readBufferProgram(SIZE.byte);
		switch (sep) {
			case 0x09: {
				term("\t");
				sep = peekBufferProgram(SIZE.byte);
				break;
			}
			case 0x0a: {
				sep = peekBufferProgram(SIZE.byte);
				break;
			}
			default: {
				term("\n");
				break;
			}
		}
	}

	return ERRORS.NONE;
}
