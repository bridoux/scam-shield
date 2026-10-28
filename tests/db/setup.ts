import { assertTestDatabase } from "../guard";

// Runs before every db test file: stop before any user is created if the env points at production.
assertTestDatabase();
