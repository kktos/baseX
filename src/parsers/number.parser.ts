import { TOKEN_TYPES } from "../defs";
import { lexeme, lexer } from "../lexer";

export function parseNum(lookahead = false) {
	const tok = lexer(lookahead);
	return !tok.err && tok.type === TOKEN_TYPES.INT ? parseInt(lexeme) : NaN;
}
