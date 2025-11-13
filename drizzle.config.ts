import {config} from "dotenv";
import {defineConfig} from "drizzle-kit";

config({path: [".env.development.local", ".env.local", ".env"]});

export default defineConfig({
    dialect: "postgresql",
    schema: "./lib/db/schema.ts",
    out: "./drizzle",
    dbCredentials: {
        url: process.env.POSTGRES_URL!,
    },
    verbose: true,
    strict: false,
});