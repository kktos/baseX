import { lexer } from "../lexer";

export function parseNum(tok?: string) {
	const intStr = tok !== undefined ? tok : lexer();
	return intStr == null ? NaN : parseInt(intStr);
}
