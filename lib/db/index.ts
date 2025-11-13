import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DATABASE_URL = process.env.POSTGRES_URL ?? "";

if (!DATABASE_URL) {
	throw new Error("POSTGRES_URL environment variable is not set");
}

// Create a connection pool with proper configuration
// This prevents "max clients reached" errors
const queryClient = postgres(DATABASE_URL, {
	max: 100, // Maximum number of connections in the pool
	idle_timeout: 20, // Close idle connections after 20 seconds
	connect_timeout: 20, // Connection timeout
});

const db = drizzle(queryClient, { schema });

export default db;